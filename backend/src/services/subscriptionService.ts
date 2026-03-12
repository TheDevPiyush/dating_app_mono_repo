import crypto from "crypto";
import mongoose, { Types } from "mongoose";
import { PaymentTransaction, Subscription, User } from "../models";
import { IUser } from "../models/User";
import { razorpayClient } from "../config/razorpay";
import {
    SUBSCRIPTION_PLANS,
    SubscriptionPlanConfig,
    SubscriptionPlanId,
} from "../config/subscriptionPlans";
import { SubscriptionStatus } from "../models/subscription";

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
        provider?: "razorpay" | "stripe" | "paypal" | "apple" | "google" | null;
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