import mongoose, { Schema, Document } from "mongoose";

export type WalletTransactionType = "recharge" | "deduction" | "refund";

export interface IWalletTransaction extends Document {
    userId: mongoose.Types.ObjectId;
    user_id: string;
    type: WalletTransactionType;
    amount: number;
    balanceAfter: number;
    reason: string;
    relatedCallId?: mongoose.Types.ObjectId | null;
    razorpayOrderId?: string | null;
    razorpayPaymentId?: string | null;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "Users", required: true, index: true },
        user_id: { type: String, required: true, index: true },
        type: { type: String, enum: ["recharge", "deduction", "refund"], required: true },
        amount: { type: Number, required: true },
        balanceAfter: { type: Number, required: true },
        reason: { type: String, required: true },
        relatedCallId: { type: Schema.Types.ObjectId, ref: "Call", default: null },
        razorpayOrderId: { type: String, default: null },
        razorpayPaymentId: { type: String, default: null },
        metadata: { type: Schema.Types.Mixed },
    },
    { timestamps: true }
);

WalletTransactionSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const WalletTransaction = mongoose.model<IWalletTransaction>(
    "WalletTransaction",
    WalletTransactionSchema
);
