import mongoose, { Schema, Document } from "mongoose";

export interface IMinutePack extends Document {
    packId: string;
    title: string;
    minutes: number;
    amountInPaise: number;
    currency: string;
    isActive: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
}

const MinutePackSchema = new Schema<IMinutePack>(
    {
        packId: { type: String, required: true, unique: true },
        title: { type: String, required: true },
        minutes: { type: Number, required: true },
        amountInPaise: { type: Number, required: true },
        currency: { type: String, default: "INR" },
        isActive: { type: Boolean, default: true },
        sortOrder: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export const MinutePack = mongoose.model<IMinutePack>("MinutePack", MinutePackSchema);

export const seedDefaultMinutePacks = async () => {
    const count = await MinutePack.countDocuments();
    if (count > 0) return;

    await MinutePack.insertMany([
        { packId: "pack_10", title: "10 Minutes", minutes: 10, amountInPaise: 9900, currency: "INR", isActive: true, sortOrder: 1 },
        { packId: "pack_30", title: "30 Minutes", minutes: 30, amountInPaise: 24900, currency: "INR", isActive: true, sortOrder: 2 },
        { packId: "pack_60", title: "60 Minutes", minutes: 60, amountInPaise: 39900, currency: "INR", isActive: true, sortOrder: 3 },
        { packId: "pack_120", title: "120 Minutes", minutes: 120, amountInPaise: 69900, currency: "INR", isActive: true, sortOrder: 4 },
    ]);
};
