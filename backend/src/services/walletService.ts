import { Types } from "mongoose";
import { User, RechargePayment, WalletTransaction, MinutePack } from "../models";
import { IUser } from "../models/User";
import { razorpayClient } from "../config/razorpay";
import { IMinutePack } from "../models/MinutePack";

interface CreateRechargeOrderParams {
    userId: string;
    packId: string;
}

interface UserRef {
    _id: Types.ObjectId;
    user_id: string;
}

export const getWalletBalance = async (userId: string) => {
    const user = await User.findOne({ user_id: userId }).select("wallet").lean<IUser>();
    if (!user) throw new Error("User not found");
    return {
        balance: user.wallet?.balance ?? 0,
        totalRecharged: user.wallet?.totalRecharged ?? 0,
        lastRechargedAt: user.wallet?.lastRechargedAt ?? null,
    };
};

export const getWalletTransactions = async (userMongoId: Types.ObjectId, limit = 50) => {
    return WalletTransaction.find({ userId: userMongoId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

export const getActiveMinutePacks = async () => {
    return MinutePack.find({ isActive: true }).sort({ sortOrder: 1 });
};

export const createRechargeOrder = async ({ userId, packId }: CreateRechargeOrderParams) => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        throw new Error("Razorpay keys are not configured on the server.");
    }

    const pack = await MinutePack.findOne({ packId, isActive: true }).lean<IMinutePack>();
    if (!pack) throw new Error("Invalid or inactive minute pack");

    const user = await User.findOne({ user_id: userId }).lean<IUser>();
    if (!user) throw new Error("User not found");

    const userMongoId = user._id as Types.ObjectId;

    await abandonPendingRecharges(userMongoId);

    const sanitizedUserId =
        userId.replace(/[^a-zA-Z0-9]/g, "").slice(-16) ||
        userMongoId.toString().slice(-16);
    const receipt = `rchg_${sanitizedUserId}_${Date.now().toString().slice(-10)}`.slice(0, 40);

    let order;
    try {
        order = await razorpayClient.orders.create({
            amount: pack.amountInPaise,
            currency: pack.currency,
            receipt,
            notes: { packId, userId, type: "recharge" },
        });
    } catch (error: any) {
        throw new Error(
            `Razorpay order creation failed: ${error?.error?.description ?? error?.message ?? "Unknown error"}`
        );
    }

    await RechargePayment.create({
        userId: userMongoId,
        user_id: userId,
        packId,
        minutes: pack.minutes,
        amount: pack.amountInPaise,
        currency: pack.currency,
        razorpayOrderId: order.id,
        status: "created",
        metadata: { receipt: order.receipt, packTitle: pack.title },
    });

    return { order, pack };
};

export const handleRechargeCaptured = async (razorpayPayment: any) => {
    const razorpayOrderId: string = razorpayPayment.order_id;
    const razorpayPaymentId: string = razorpayPayment.id;

    const payment = await RechargePayment.findOne({ razorpayOrderId });
    if (!payment) {
        throw new Error(`Recharge payment not found for order: ${razorpayOrderId}`);
    }

    if (payment.status === "captured") return;

    payment.razorpayPaymentId = razorpayPaymentId;
    payment.status = "captured";
    await payment.save();

    const user = await User.findById(payment.userId).lean<IUser>();
    if (!user) throw new Error("User not found for captured recharge");

    const userMongoId = payment.userId as Types.ObjectId;

    const updated = await User.findByIdAndUpdate(
        userMongoId,
        {
            $inc: {
                "wallet.balance": payment.minutes,
                "wallet.totalRecharged": payment.minutes,
            },
            $set: { "wallet.lastRechargedAt": new Date() },
        },
        { new: true }
    ).lean<IUser>();

    await WalletTransaction.create({
        userId: userMongoId,
        user_id: user.user_id,
        type: "recharge",
        amount: payment.minutes,
        balanceAfter: updated?.wallet?.balance ?? payment.minutes,
        reason: `recharge_${payment.packId}`,
        razorpayOrderId,
        razorpayPaymentId,
        metadata: { packId: payment.packId, amountPaid: payment.amount },
    });
};

export const handleRechargeFailed = async (razorpayPayment: any) => {
    const razorpayOrderId: string = razorpayPayment.order_id;

    const payment = await RechargePayment.findOne({ razorpayOrderId });
    if (!payment) return;

    if (payment.status === "failed") return;

    payment.status = "failed";
    payment.error = { reason: razorpayPayment.error_reason ?? "payment_failed" };
    await payment.save();
};

export const deductToken = async (
    userId: string,
    callId?: Types.ObjectId
): Promise<{ success: boolean; newBalance: number }> => {
    const result = await User.findOneAndUpdate(
        { user_id: userId, "wallet.balance": { $gte: 1 } },
        { $inc: { "wallet.balance": -1 } },
        { new: true }
    ).lean<IUser>();

    if (!result) {
        return { success: false, newBalance: 0 };
    }

    const newBalance = result.wallet?.balance ?? 0;

    await WalletTransaction.create({
        userId: result._id,
        user_id: userId,
        type: "deduction",
        amount: 1,
        balanceAfter: newBalance,
        reason: "explore_call",
        relatedCallId: callId ?? null,
    });

    return { success: true, newBalance };
};

export const checkBalance = async (userId: string): Promise<number> => {
    const user = await User.findOne({ user_id: userId }).select("wallet.balance").lean<IUser>();
    return user?.wallet?.balance ?? 0;
};

export const abandonPendingRecharges = async (userMongoId: Types.ObjectId) => {
    await RechargePayment.updateMany(
        { userId: userMongoId, status: { $in: ["created"] } },
        { $set: { status: "abandoned", updatedAt: new Date() } }
    );
};

export const getRechargeByOrderId = async (
    razorpayOrderId: string,
    userMongoId: Types.ObjectId
) => {
    return RechargePayment.findOne({ razorpayOrderId, userId: userMongoId });
};
