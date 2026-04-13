import crypto from "crypto";
import mongoose, { Types } from "mongoose";
import { PaymentTransaction, Subscription, User } from "../models";
import { IUser } from "../models/User";
import { razorpayClient } from "../config/razorpay";
import {
    SUBSCRIPTION_PLANS,
    RAZORPAY_PLAN_IDS,
    SubscriptionPlanConfig,
    SubscriptionPlanId,
} from "../config/subscriptionPlans";
import { SubscriptionStatus } from "../models/subscription";
import { getRazorpayPublicKey } from "../config/razorpay";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CreateOrderParams {
    userId: string;
    planId: SubscriptionPlanId;
}

type UserSubscriptionStatus = SubscriptionStatus | "none";

// Minimal user shape needed internally — avoids fighting Mongoose document types
interface UserRef {
    _id: Types.ObjectId;
    user_id: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const getPlanConfig = (planId: SubscriptionPlanId): SubscriptionPlanConfig => {
    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan) throw new Error(`Invalid plan: ${planId}`);
    return plan;
};

const updateUserSubscriptionSnapshot = async (
    userMongoId: Types.ObjectId,
    payload: {
        status: UserSubscriptionStatus;
        plan?: SubscriptionPlanId | null;
        startDate?: Date | null;
        endDate?: Date | null;
        autoRenew?: boolean;
        lastPaymentAt?: Date | null;
        provider?: "razorpay" | "stripe" | "paypal" | "apple" | "google" | "adminprivilaged" | null;
    }
) => {
    await User.updateOne(
        { _id: userMongoId },
        {
            $set: {
                "subscription.status": payload.status,
                "subscription.plan": payload.plan ?? null,
                "subscription.startDate": payload.startDate ?? null,
                "subscription.endDate": payload.endDate ?? null,
                "subscription.autoRenew": payload.autoRenew ?? true,
                "subscription.lastPaymentAt": payload.lastPaymentAt ?? null,
                "subscription.provider": payload.provider ?? null,
                "subscription.updatedAt": new Date(),
            },
        }
    );
};

const verifyRazorpaySignature = (
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
): boolean => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
    const generated = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");
    return generated === razorpaySignature;
};

// Takes UserRef instead of full Mongoose document to avoid type conflicts
const upsertSubscription = async (
    user: UserRef,
    planId: SubscriptionPlanId,
    razorpayPaymentId: string,
    planConfig: SubscriptionPlanConfig
) => {
    const now = new Date();
    const endDate = new Date(now.getTime() + planConfig.durationDays * 24 * 60 * 60 * 1000);

    const updatedSubscription = await Subscription.findOneAndUpdate(
        { $or: [{ user_id: user.user_id }, { userId: user._id }] },
        {
            user_id: user.user_id,
            userId: user._id,
            plan: planId,
            status: "active",
            startDate: now,
            endDate,
            autoRenew: true,
            paymentProvider: "razorpay",
            transactionId: razorpayPaymentId,
            lastPaymentAt: now,
            metadata: {
                planTitle: planConfig.title,
                amountInPaise: planConfig.amountInPaise,
            },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await updateUserSubscriptionSnapshot(user._id, {
        status: "active",
        plan: planId,
        startDate: now,
        endDate,
        autoRenew: true,
        lastPaymentAt: now,
        provider: "razorpay",
    });

    return updatedSubscription;
};

// ─── Order Creation ───────────────────────────────────────────────────────────

export const createRazorpayOrder = async ({ userId, planId }: CreateOrderParams) => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay keys are not configured on the server.");
    }

    const plan = getPlanConfig(planId);

    const user = await User.findOne({ user_id: userId }).lean<IUser>();
    if (!user) throw new Error("User not found");

    const userMongoId = user._id as Types.ObjectId;

    // Abandon any stale pending/created payments before creating a new order
    await abandonPendingPayments(userMongoId);

    const sanitizedUserId =
        userId.replace(/[^a-zA-Z0-9]/g, "").slice(-16) ||
        userMongoId.toString().slice(-16);
    const receipt = `rcpt_${sanitizedUserId}_${Date.now().toString().slice(-10)}`.slice(0, 40);

    let order;
    try {
        order = await razorpayClient.orders.create({
            amount: plan.amountInPaise,
            currency: plan.currency,
            receipt,
            notes: { planId, userId },
        });
    } catch (error: any) {
        throw new Error(
            `Razorpay order creation failed: ${error?.error?.description ?? error?.message ?? "Unknown error"}`
        );
    }

    await PaymentTransaction.create({
        userId: userMongoId,
        plan: planId,
        amount: plan.amountInPaise,
        currency: plan.currency,
        razorpayOrderId: order.id,
        status: "created",
        metadata: { receipt: order.receipt },
    });

    await updateUserSubscriptionSnapshot(userMongoId, {
        status: "pending",
        plan: planId,
        autoRenew: true,
        provider: "razorpay",
    });

    return { order, plan };
};

// ─── Webhook Handlers (source of truth) ──────────────────────────────────────

export const handlePaymentCaptured = async (razorpayPayment: any) => {
    const razorpayOrderId: string = razorpayPayment.order_id;
    const razorpayPaymentId: string = razorpayPayment.id;

    const payment = await PaymentTransaction.findOne({ razorpayOrderId });
    if (!payment) {
        throw new Error(`Payment record not found for order: ${razorpayOrderId}`);
    }

    if (payment.status === "captured") return;

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.status = "captured";
    await payment.save();

    const user = await User.findById(payment.userId).lean<IUser>();
    if (!user) throw new Error("User not found for captured payment");

    const userRef: UserRef = {
        _id: payment.userId as Types.ObjectId,
        user_id: user.user_id,
    };

    const planConfig = getPlanConfig(payment.plan);
    await upsertSubscription(userRef, payment.plan, razorpayPaymentId, planConfig);
};

export const handlePaymentFailed = async (razorpayPayment: any) => {
    const razorpayOrderId: string = razorpayPayment.order_id;

    const payment = await PaymentTransaction.findOne({ razorpayOrderId });
    if (!payment) return;

    // Idempotency
    if (payment.status === "failed") return;

    payment.status = "failed";
    payment.error = { reason: razorpayPayment.error_reason ?? "payment_failed" };
    await payment.save();

    const user = await User.findById(payment.userId).lean<IUser>();
    if (!user) return;

    const userMongoId = payment.userId as Types.ObjectId;

    // Only reset snapshot if no active subscription exists
    const activeSubscription = await Subscription.findOne({
        $or: [{ user_id: user.user_id }, { userId: userMongoId }],
        status: "active",
    });

    if (!activeSubscription) {
        await updateUserSubscriptionSnapshot(userMongoId, {
            status: "none",
            plan: null,
            startDate: null,
            endDate: null,
            provider: null,
        });
    }
};

// ─── Pending Cleanup ──────────────────────────────────────────────────────────

export const abandonPendingPayments = async (userMongoId: Types.ObjectId) => {
    // userId in PaymentTransaction is ObjectId — no toString() needed
    await PaymentTransaction.updateMany(
        { userId: userMongoId, status: { $in: ["created", "pending"] } },
        { $set: { status: "abandoned", updatedAt: new Date() } }
    );
};

// ─── Verification ─────────────────────────────────────────────────────────────

export const getPaymentByOrderId = async (
    razorpayOrderId: string,
    userMongoId: Types.ObjectId
) => {
    // userId is ObjectId in the schema — direct match, no casting needed
    return PaymentTransaction.findOne({ razorpayOrderId, userId: userMongoId });
};

export const verifyPaymentSignature = (
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string
): boolean => {
    return verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
};

// ─── Queries ──────────────────────────────────────────────────────────────────

export const getActiveSubscription = async (
    userMongoId: Types.ObjectId,
    userId: string
) => {
    const user = await User.findById(userMongoId).select("subscription").lean<IUser>();

    const subscription = await Subscription.findOne({
        $or: [{ user_id: userId }, { userId: userMongoId }],
        status: "active",
    }).sort({ updatedAt: -1 });

    if (!subscription) {
        // Don't wipe pending — checkout may still be in progress
        if (user?.subscription?.status !== "pending") {
            await updateUserSubscriptionSnapshot(userMongoId, {
                status: "none",
                plan: null,
                startDate: null,
                endDate: null,
                autoRenew: true,
                lastPaymentAt: null,
                provider: null,
            });
        }
        return null;
    }

    if (subscription.endDate < new Date()) {
        subscription.status = "expired";
        await subscription.save();
        await updateUserSubscriptionSnapshot(userMongoId, {
            status: "expired",
            plan: subscription.plan,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
            autoRenew: subscription.autoRenew,
            lastPaymentAt: subscription.lastPaymentAt ?? null,
            provider: subscription.paymentProvider,
        });
        return null;
    }

    await updateUserSubscriptionSnapshot(userMongoId, {
        status: "active",
        plan: subscription.plan,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        autoRenew: subscription.autoRenew,
        lastPaymentAt: subscription.lastPaymentAt ?? null,
        provider: subscription.paymentProvider,
    });

    return subscription;
};

export const getPaymentHistory = async (userMongoId: Types.ObjectId) => {
    return PaymentTransaction.find({ userId: userMongoId })
        .sort({ createdAt: -1 })
        .limit(20);
};

export const getUserSubscriptionPlan = async (user_id: string) => {
    const user = await User.findOne({ user_id }).lean<IUser>();
    if (!user) throw new Error("User not found");
    return user.subscription?.plan;
};

// ─── Razorpay E-Mandate Subscriptions ─────────────────────────────────────────

export const createRazorpaySubscription = async ({
    userId,
    planId,
}: CreateOrderParams) => {
    const razorpayPlanId = RAZORPAY_PLAN_IDS[planId];
    if (!razorpayPlanId) {
        throw new Error(`Razorpay plan not synced for "${planId}". Restart server to sync.`);
    }

    const plan = getPlanConfig(planId);
    const user = await User.findOne({ user_id: userId }).lean<IUser>();
    if (!user) throw new Error("User not found");

    const userMongoId = user._id as Types.ObjectId;

    // Cancel any existing Razorpay subscription before creating a new one
    const existingSub = await Subscription.findOne({
        $or: [{ user_id: userId }, { userId: userMongoId }],
        status: "active",
        razorpaySubscriptionId: { $exists: true, $ne: null },
    });

    if (existingSub?.razorpaySubscriptionId) {
        try {
            await razorpayClient.subscriptions.cancel(existingSub.razorpaySubscriptionId, false);
        } catch (e: any) {
            console.warn("Could not cancel old subscription:", e?.message);
        }
    }

    const razorpaySub = await razorpayClient.subscriptions.create({
        plan_id: razorpayPlanId,
        total_count: 12,
        quantity: 1,
        customer_notify: 1,
        notes: { userId, planId, internalPlanId: planId },
    } as any);

    // Upsert a pending subscription record
    await Subscription.findOneAndUpdate(
        { $or: [{ user_id: userId }, { userId: userMongoId }] },
        {
            user_id: userId,
            userId: userMongoId,
            plan: planId,
            status: "pending",
            startDate: new Date(),
            endDate: new Date(Date.now() + plan.durationDays * 86400000),
            autoRenew: true,
            paymentProvider: "razorpay",
            razorpaySubscriptionId: razorpaySub.id,
            razorpayPlanId,
        },
        { upsert: true, new: true },
    );

    await updateUserSubscriptionSnapshot(userMongoId, {
        status: "pending",
        plan: planId,
        autoRenew: true,
        provider: "razorpay",
    });

    return {
        subscriptionId: razorpaySub.id,
        razorpayKey: getRazorpayPublicKey(),
        plan,
    };
};

export const verifySubscriptionSignature = (
    razorpayPaymentId: string,
    razorpaySubscriptionId: string,
    razorpaySignature: string,
): boolean => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
    const generated = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpayPaymentId}|${razorpaySubscriptionId}`)
        .digest("hex");
    return generated === razorpaySignature;
};

export const cancelRazorpaySubscription = async (userId: string) => {
    const user = await User.findOne({ user_id: userId }).lean<IUser>();
    if (!user) throw new Error("User not found");

    const userMongoId = user._id as Types.ObjectId;
    const sub = await Subscription.findOne({
        $or: [{ user_id: userId }, { userId: userMongoId }],
        status: "active",
        razorpaySubscriptionId: { $exists: true, $ne: null },
    });

    if (!sub?.razorpaySubscriptionId) {
        throw new Error("No active Razorpay subscription found");
    }

    await razorpayClient.subscriptions.cancel(sub.razorpaySubscriptionId, true);

    sub.autoRenew = false;
    await sub.save();

    await updateUserSubscriptionSnapshot(userMongoId, {
        status: "active",
        plan: sub.plan,
        startDate: sub.startDate,
        endDate: sub.endDate,
        autoRenew: false,
        lastPaymentAt: sub.lastPaymentAt ?? null,
        provider: "razorpay",
    });

    return sub;
};

// ─── Subscription Webhook Lifecycle Handlers ──────────────────────────────────

export const handleSubscriptionAuthenticated = async (payload: any) => {
    const razorpaySubId = payload.subscription?.entity?.id;
    if (!razorpaySubId) return;

    console.info(`Subscription ${razorpaySubId} — mandate authenticated`);
};

export const handleSubscriptionActivated = async (payload: any) => {
    const subEntity = payload.subscription?.entity;
    if (!subEntity?.id) return;

    const sub = await Subscription.findOne({ razorpaySubscriptionId: subEntity.id });
    if (!sub) return;

    const user = await User.findOne({ user_id: sub.user_id }).lean<IUser>();
    if (!user) return;

    const planConfig = getPlanConfig(sub.plan);
    const now = new Date();
    const endDate = new Date(now.getTime() + planConfig.durationDays * 86400000);

    sub.status = "active";
    sub.startDate = now;
    sub.endDate = endDate;
    sub.lastPaymentAt = now;
    await sub.save();

    await updateUserSubscriptionSnapshot(user._id as Types.ObjectId, {
        status: "active",
        plan: sub.plan,
        startDate: now,
        endDate,
        autoRenew: true,
        lastPaymentAt: now,
        provider: "razorpay",
    });

    console.info(`Subscription ${subEntity.id} activated for user ${sub.user_id}`);
};

export const handleSubscriptionCharged = async (payload: any) => {
    const subEntity = payload.subscription?.entity;
    const paymentEntity = payload.payment?.entity;
    if (!subEntity?.id) return;

    const sub = await Subscription.findOne({ razorpaySubscriptionId: subEntity.id });
    if (!sub) return;

    const user = await User.findOne({ user_id: sub.user_id }).lean<IUser>();
    if (!user) return;

    const planConfig = getPlanConfig(sub.plan);
    const now = new Date();
    const endDate = new Date(now.getTime() + planConfig.durationDays * 86400000);

    sub.status = "active";
    sub.endDate = endDate;
    sub.lastPaymentAt = now;
    if (paymentEntity?.id) sub.transactionId = paymentEntity.id;
    await sub.save();

    await updateUserSubscriptionSnapshot(user._id as Types.ObjectId, {
        status: "active",
        plan: sub.plan,
        startDate: sub.startDate,
        endDate,
        autoRenew: true,
        lastPaymentAt: now,
        provider: "razorpay",
    });

    console.info(`Subscription ${subEntity.id} charged (renewal) for user ${sub.user_id}`);
};

export const handleSubscriptionHalted = async (payload: any) => {
    const subEntity = payload.subscription?.entity;
    if (!subEntity?.id) return;

    const sub = await Subscription.findOne({ razorpaySubscriptionId: subEntity.id });
    if (!sub) return;

    const user = await User.findOne({ user_id: sub.user_id }).lean<IUser>();
    if (!user) return;

    sub.status = "expired";
    sub.autoRenew = false;
    await sub.save();

    await updateUserSubscriptionSnapshot(user._id as Types.ObjectId, {
        status: "expired",
        plan: sub.plan,
        startDate: sub.startDate,
        endDate: sub.endDate,
        autoRenew: false,
        lastPaymentAt: sub.lastPaymentAt ?? null,
        provider: "razorpay",
    });

    console.info(`Subscription ${subEntity.id} halted for user ${sub.user_id}`);
};

export const handleSubscriptionCancelled = async (payload: any) => {
    const subEntity = payload.subscription?.entity;
    if (!subEntity?.id) return;

    const sub = await Subscription.findOne({ razorpaySubscriptionId: subEntity.id });
    if (!sub) return;

    const user = await User.findOne({ user_id: sub.user_id }).lean<IUser>();
    if (!user) return;

    sub.status = "cancelled";
    sub.autoRenew = false;
    await sub.save();

    await updateUserSubscriptionSnapshot(user._id as Types.ObjectId, {
        status: "cancelled",
        plan: sub.plan,
        startDate: sub.startDate,
        endDate: sub.endDate,
        autoRenew: false,
        lastPaymentAt: sub.lastPaymentAt ?? null,
        provider: "razorpay",
    });

    console.info(`Subscription ${subEntity.id} cancelled for user ${sub.user_id}`);
};

// ─── Interaction Limits ───────────────────────────────────────────────────────

export const checkAndUpdateInteractionLimit = async (
    userMongoId: Types.ObjectId,
    session?: mongoose.ClientSession
): Promise<{ allowed: boolean; remaining: number; limit: number }> => {
    const query = User.findById(userMongoId);
    if (session) query.session(session);
    const user = await query.lean<IUser>();

    if (!user) throw new Error("User not found");

    const now = new Date();
    const lastReset = user.lastInteractionResetAt ?? user.createdAt;
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    let currentCount = user.dailyInteractionCount ?? 0;

    if (hoursSinceReset >= 24) {
        currentCount = 0;
        const resetUpdate = User.findByIdAndUpdate(userMongoId, {
            dailyInteractionCount: 0,
            lastInteractionResetAt: now,
        });
        if (session) resetUpdate.session(session);
        await resetUpdate;
    }

    const planId: SubscriptionPlanId =
        user.subscription?.plan &&
            (["basic", "premium", "super", "free"] as SubscriptionPlanId[]).includes(
                user.subscription.plan as SubscriptionPlanId
            )
            ? (user.subscription.plan as SubscriptionPlanId)
            : "free";

    const planConfig = getPlanConfig(planId);
    const limit = planConfig.interaction_per_day;

    if (currentCount >= limit) {
        return { allowed: false, remaining: 0, limit };
    }

    const newCount = currentCount + 1;
    const countUpdate = User.findByIdAndUpdate(userMongoId, {
        dailyInteractionCount: newCount,
    });
    if (session) countUpdate.session(session);
    await countUpdate;

    return { allowed: true, remaining: limit - newCount, limit };
};