import mongoose, { Schema, Document } from "mongoose";

export type RechargePaymentStatus = "created" | "authorized" | "captured" | "failed" | "refunded" | "abandoned";

export interface IRechargePayment extends Document {
    userId: mongoose.Types.ObjectId;
    user_id: string;
    packId: string;
    minutes: number;
    amount: number;
    currency: string;
    status: RechargePaymentStatus;
    razorpayOrderId: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    error?: {
        code?: string;
        description?: string;
        reason?: string;
    };
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const RechargePaymentSchema = new Schema<IRechargePayment>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "Users", required: true, index: true },
        user_id: { type: String, required: true, index: true },
        packId: { type: String, required: true },
        minutes: { type: Number, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, default: "INR" },
        status: {
            type: String,
            enum: ["created", "authorized", "captured", "failed", "refunded", "abandoned"],
            default: "created",
        },
        razorpayOrderId: { type: String, required: true, unique: true },
        razorpayPaymentId: { type: String },
        razorpaySignature: { type: String },
        error: {
            code: String,
            description: String,
            reason: String,
        },
        metadata: { type: Schema.Types.Mixed },
    },
    { timestamps: true }
);

RechargePaymentSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });
RechargePaymentSchema.index({ status: 1, createdAt: -1 });

export const RechargePayment = mongoose.model<IRechargePayment>(
    "RechargePayment",
    RechargePaymentSchema
);
