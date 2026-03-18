import { Request, Response } from "express";
import {
    SUBSCRIPTION_PLANS,
    isValidPlanId,
    SubscriptionPlanId,
} from "../config/subscriptionPlans";
import {
    createRazorpayOrder,
    getActiveSubscription,
    getPaymentByOrderId,
    getPaymentHistory,
    handlePaymentCaptured,
    handlePaymentFailed,
    abandonPendingPayments,
    createRazorpaySubscription,
    verifySubscriptionSignature,
    cancelRazorpaySubscription,
    handleSubscriptionAuthenticated,
    handleSubscriptionActivated,
    handleSubscriptionCharged,
    handleSubscriptionHalted,
    handleSubscriptionCancelled,
} from "../services/subscriptionService";
import {
    handleRechargeCaptured,
    handleRechargeFailed,
} from "../services/walletService";
import { getRazorpayPublicKey } from "../config/razorpay";
import { Types } from "mongoose";
import crypto from "crypto";

export const getPlans = async (_req: Request, res: Response) => {
    try {
        res.json({
            success: true,
            data: Object.values(SUBSCRIPTION_PLANS),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch plans" });
    }
};

export const getCurrentSubscription = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user?._id) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const subscription = await getActiveSubscription(
            new Types.ObjectId(user._id.toString()),
            user.user_id
        );

        res.json({
            success: true,
            data: subscription,
            meta: {
                subscriptionSnapshot: user.subscription ?? { status: "none" },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch subscription" });
    }
};

export const getPayments = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user?._id) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const payments = await getPaymentHistory(new Types.ObjectId(user._id.toString()));

        res.json({
            success: true,
            data: payments,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to fetch payments" });
    }
};

export const createOrder = async (req: Request, res: Response) => {
    try {
        const planId = req.body.planId as string;
        if (!planId || !isValidPlanId(planId)) {
            return res.status(400).json({ success: false, message: "Invalid plan" });
        }

        const user = req.user;
        if (!user?._id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // _id from req.user is the MongoDB ObjectId — pass it directly
        await abandonPendingPayments(new Types.ObjectId(user._id.toString()));

        const { order, plan } = await createRazorpayOrder({
            planId: planId as SubscriptionPlanId,
            userId: user.user_id,
        });

        res.json({
            success: true,
            data: {
                order,
                plan,
                razorpayKey: getRazorpayPublicKey(),
            },
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to create order",
        });
    }
};

// Webhook is source of truth — this just confirms current DB state to the frontend
export const verifyOrder = async (req: Request, res: Response) => {
    try {
        const {
            razorpay_order_id: razorpayOrderId,
            razorpay_payment_id: razorpayPaymentId,
            razorpay_signature: razorpaySignature,
        } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return res.status(400).json({
                success: false,
                message: "Missing Razorpay payment details",
            });
        }

        const user = req.user;
        if (!user?._id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Sanity check — webhook is source of truth but we still verify signature here
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest("hex");

        if (expectedSignature !== razorpaySignature) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment signature",
            });
        }

        const userMongoId = new Types.ObjectId(user._id.toString());

        // getPaymentByOrderId expects ObjectId — fixed from passing user.user_id (string)
        const payment = await getPaymentByOrderId(razorpayOrderId, userMongoId);

        if (!payment) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const subscription =
            payment.status === "captured"
                ? await getActiveSubscription(userMongoId, user.user_id)
                : null;

        res.json({
            success: true,
            data: {
                payment,
                subscription,
                // payment.plan not payment.planId — matches IPaymentTransaction
                plan: payment.plan
                    ? SUBSCRIPTION_PLANS[payment.plan as SubscriptionPlanId]
                    : null,
            },
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Payment verification failed",
        });
    }
};

// ─── E-Mandate Subscription (native app flow) ────────────────────────────────

export const createSubscriptionOrder = async (req: Request, res: Response) => {
    try {
        const planId = req.body.planId as string;
        if (!planId || !isValidPlanId(planId)) {
            return res.status(400).json({ success: false, message: "Invalid plan" });
        }

        const user = req.user;
        if (!user?._id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const result = await createRazorpaySubscription({
            userId: user.user_id,
            planId: planId as SubscriptionPlanId,
        });

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Failed to create subscription",
        });
    }
};

export const verifySubscriptionOrder = async (req: Request, res: Response) => {
    try {
        const {
            razorpay_payment_id: paymentId,
            razorpay_subscription_id: subscriptionId,
            razorpay_signature: signature,
        } = req.body;

        if (!paymentId || !subscriptionId || !signature) {
            return res.status(400).json({ success: false, message: "Missing payment details" });
        }

        const user = req.user;
        if (!user?._id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const valid = verifySubscriptionSignature(paymentId, subscriptionId, signature);
        if (!valid) {
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }

        const userMongoId = new Types.ObjectId(user._id.toString());
        const subscription = await getActiveSubscription(userMongoId, user.user_id);

        res.json({ success: true, data: { subscription, verified: true } });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Verification failed",
        });
    }
};

export const cancelSubscription = async (req: Request, res: Response) => {
    try {
        const user = req.user;
        if (!user?._id) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const sub = await cancelRazorpaySubscription(user.user_id);

        res.json({ success: true, data: { subscription: sub } });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : "Cancellation failed",
        });
    }
};

// ─── Webhook ──────────────────────────────────────────────────────────────────

export const subscriptionWebhook = async (req: Request, res: Response) => {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
    const signature = req.headers["x-razorpay-signature"] as string;

    if (!signature) {
        return res.status(400).json({ success: false, message: "Missing signature" });
    }

    let rawBody: string;
    if (req.body instanceof Buffer) {
        rawBody = req.body.toString("utf-8");
    } else if (typeof req.body === "string") {
        rawBody = req.body;
    } else {
        console.error("Webhook body was pre-parsed — raw body unavailable");
        return res.status(400).json({ success: false, message: "Invalid body format" });
    }

    const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

    if (signature !== expectedSignature) {
        console.error("Webhook signature mismatch");
        return res.status(400).json({ success: false, message: "Invalid signature" });
    }

    res.json({ success: true });

    let parsedBody: any;
    try {
        parsedBody = JSON.parse(rawBody);
    } catch {
        console.error("Failed to parse webhook body");
        return;
    }

    const event = parsedBody.event as string;
    const payment = parsedBody.payload?.payment?.entity;

    try {
        // Subscription lifecycle events (E-mandate)
        if (event.startsWith("subscription.")) {
            switch (event) {
                case "subscription.authenticated":
                    await handleSubscriptionAuthenticated(parsedBody.payload);
                    break;
                case "subscription.activated":
                    await handleSubscriptionActivated(parsedBody.payload);
                    break;
                case "subscription.charged":
                    await handleSubscriptionCharged(parsedBody.payload);
                    break;
                case "subscription.halted":
                    await handleSubscriptionHalted(parsedBody.payload);
                    break;
                case "subscription.cancelled":
                    await handleSubscriptionCancelled(parsedBody.payload);
                    break;
                default:
                    console.info(`Unhandled subscription event: ${event}`);
            }
            return;
        }

        // Payment events (one-time orders)
        if (!payment) {
            console.error("Webhook received with no payment entity");
            return;
        }

        const isRecharge = payment.notes?.type === "recharge";

        if (isRecharge) {
            if (event === "payment.captured") {
                await handleRechargeCaptured(payment);
            } else if (event === "payment.failed") {
                await handleRechargeFailed(payment);
            }
        } else {
            if (event === "payment.captured") {
                await handlePaymentCaptured(payment);
            } else if (event === "payment.failed") {
                await handlePaymentFailed(payment);
            }
        }
    } catch (error) {
        console.error(`Webhook handler failed for event [${event}]:`, error);
    }
};