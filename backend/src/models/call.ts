import mongoose, { Schema, Document } from "mongoose";

export type CallStatus = "initiated" | "connected" | "ended" | "missed" | "rejected";
export type CallContext = "match" | "explore";

export interface ICall extends Document {
    callerId: string;
    receiverId: string;
    callType: "voice" | "video";
    callContext: CallContext;
    status: CallStatus;
    startedAt?: Date | null;
    endedAt?: Date | null;
    durationSeconds: number;
    tokensSpent: number;
    matchId?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CallSchema = new Schema<ICall>(
    {
        callerId: { type: String, required: true, index: true },
        receiverId: { type: String, required: true, index: true },
        callType: { type: String, enum: ["voice", "video"], default: "voice" },
        callContext: { type: String, enum: ["match", "explore"], required: true },
        status: {
            type: String,
            enum: ["initiated", "connected", "ended", "missed", "rejected"],
            default: "initiated",
        },
        startedAt: { type: Date, default: null },
        endedAt: { type: Date, default: null },
        durationSeconds: { type: Number, default: 0 },
        tokensSpent: { type: Number, default: 0 },
        matchId: { type: String, default: null },
    },
    { timestamps: true }
);

CallSchema.index({ callContext: 1, callerId: 1, createdAt: -1 });
CallSchema.index({ callContext: 1, receiverId: 1, createdAt: -1 });

export const Call = mongoose.model<ICall>("Call", CallSchema);
