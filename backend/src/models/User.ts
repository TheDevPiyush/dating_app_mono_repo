import mongoose, { Schema, Document } from "mongoose";
import { SubscriptionStatus } from "./subscription";
import { SubscriptionPlanId } from "../config/subscriptionPlans";

export interface IUser extends Document {
    user_id: string;
    referralCode?: string;
    email: string;
    phoneNumber?: string;
    displayName?: string;
    photoURL?: string;
    provider: "google" | "email" | "phone";
    isEmailVerified: boolean;
    isPhoneVerified: boolean;
    status: "active" | "banned" | "deleted" | "suspended";
    profile?: IUserProfile;
    preferences?: IUserPreferences;
    subscription?: IUserSubscriptionSnapshot;
    dailyInteractionCount?: number;
    lastInteractionResetAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    lastLoginAt?: Date;
    notificationTokens?: string[];
    isAdmin?: boolean;
    isModerator?: boolean;
    wallet: IUserWallet;
    girlEmployDetails: IPookieyGirlEmployeeDetails;
}

export interface IUserProfile {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    gender: "male" | "female" | "other";
    bio?: string;
    location?: {
        type: "Point";
        coordinates: [number, number];
        city?: string;
        country?: string;
    };
    photos: { url: string; isPrimary?: boolean; uploadedAt: Date }[];
    interests: string[];
    height?: number;
    education?: string;
    occupation?: string;
    company?: string;
    school?: string;
    isOnboarded: boolean;
}

export interface IUserPreferences {
    distanceMaxKm: number;
    ageRange: [number, number];
    showMe: ("male" | "female")[];
    notificationPermissions: {
        like: boolean;
        message: boolean;
        match: boolean;
        comment: boolean;
        follow: boolean;
    };
}

export interface IUserSubscriptionSnapshot {
    status: SubscriptionStatus | "none";
    plan?: SubscriptionPlanId | null;
    startDate?: Date | null;
    endDate?: Date | null;
    autoRenew?: boolean;
    lastPaymentAt?: Date | null;
    provider?: "razorpay" | "stripe" | "paypal" | "apple" | "google" | "adminprivilaged" | null;
    updatedAt?: Date | null;
}


export interface IPookieyGirlEmployeeDetails {
    isGirlEmployee: boolean;
    employeLocation?: string | null,
    workingHourStart?: Date | null;
    workingHourEnd?: Date | null;
    isAvailableForCall?: boolean;
    isVideoCallAllowed?: boolean;
    isAudioCallAllowed?: boolean;
}

export interface IUserWallet {
    balance: number;
    totalRecharged: number;
    lastRechargedAt?: Date | null;
}

const UserSchema = new Schema<IUser>(
    {
        user_id: { type: String, required: true, unique: true, index: true },
        referralCode: { type: String, unique: true, sparse: true, index: true },
        email: { type: String, required: true, unique: true, index: true },
        phoneNumber: { type: String, unique: true, sparse: true, index: true, },
        displayName: { type: String, default: "" },
        photoURL: { type: String, default: "" },
        provider: {
            type: String,
            enum: ["google", "email", "phone"],
            required: true,
            default: "email"
        },
        isEmailVerified: { type: Boolean, default: false },
        isPhoneVerified: { type: Boolean, default: false },
        status: {
            type: String,
            enum: ["active", "banned", "deleted", "suspended"],
            default: "active",
        },
        profile: {
            firstName: { type: String, index: true },
            lastName: { type: String, index: true },
            dateOfBirth: Date,
            gender: { type: String, enum: ["male", "female", "other"] },
            bio: { type: String, default: "" },
            location: {
                type: { type: String, enum: ["Point"], default: "Point" },
                coordinates: { type: [Number], index: "2dsphere" },
                city: String,
                country: String,
            },
            photos: [
                {
                    url: { type: String, default: "" },
                    isPrimary: { type: Boolean, default: false },
                    uploadedAt: { type: Date, default: Date.now },
                },
            ],
            interests: [String],
            height: { type: Number, default: 0 },
            education: { type: String, default: "" },
            occupation: { type: String, default: "" },
            company: { type: String, default: "" },
            school: { type: String, default: "" },
            isOnboarded: { type: Boolean, default: false },
        },
        preferences: {
            distanceMaxKm: { type: Number, default: 50 },
            ageRange: { type: [Number], default: [18, 35] },
            showMe: { type: [String], enum: ["male", "female"] },
        },
        subscription: {
            status: {
                type: String,
                enum: ["none", "pending", "active", "expired", "cancelled"],
                default: "none",
            },
            plan: {
                type: String,
                enum: ["basic", "premium", "super", "free"],
                default: "free",
            },
            startDate: { type: Date, default: null },
            endDate: { type: Date, default: null },
            autoRenew: { type: Boolean, default: true },
            lastPaymentAt: { type: Date, default: null },
            provider: {
                type: String,
                enum: ["razorpay", "stripe", "paypal", "apple", "google", "adminprivilaged", null],
                default: null,
            },
            updatedAt: { type: Date, default: null },
        },
        dailyInteractionCount: { type: Number, default: 0 },
        lastInteractionResetAt: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now },
        updatedAt: { type: Date, default: Date.now },
        lastLoginAt: { type: Date, default: Date.now },
        notificationTokens: { type: [String], default: [] },
        isAdmin: { type: Boolean, default: false },
        isModerator: { type: Boolean, default: false },
        wallet: {
            balance: { type: Number, default: 0 },
            totalRecharged: { type: Number, default: 0 },
            lastRechargedAt: { type: Date, default: null },
        },
        girlEmployDetails: {
            isGirlEmployee: { type: Boolean, default: false },
            employeLocation: { type: String, default: null },
            workingHourEnd: { type: Date, default: null },
            workingHourStart: { type: Date, default: null },
            workingDateStart: { type: Date, default: null },
            workingDateEnd: { type: Date, default: null },
            isAvailableForCall: { type: Boolean, default: true },
            isVideoCallAllowed: { type: Boolean, default: false },
            isAudioCallAllowed: { type: Boolean, default: false },

        }
    },
    { timestamps: true }
);

export const User = mongoose.model<IUser>("Users", UserSchema);
