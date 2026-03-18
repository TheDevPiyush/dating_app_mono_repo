export type SubscriptionPlanId = "basic" | "premium" | "super" | "free";

export interface SubscriptionPlanConfig {
    id: SubscriptionPlanId;
    title: string;
    amountInPaise: number;
    currency: "INR";
    durationDays: number;
    features: string[];
    interaction_per_day: number;
    razorpayPeriod: "daily" | "weekly" | "monthly" | "yearly";
    razorpayInterval: number;
}

// Mutable runtime map — populated by razorpayPlanSync at startup
export const RAZORPAY_PLAN_IDS: Partial<Record<SubscriptionPlanId, string>> = {};

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlanConfig> = {
    free: {
        id: "free",
        title: "Free",
        amountInPaise: 0,
        currency: "INR",
        durationDays: 0,
        features: [],
        interaction_per_day: 15,
        razorpayPeriod: "monthly",
        razorpayInterval: 1,
    },
    basic: {
        id: "basic",
        title: "Basic",
        amountInPaise: 49900,
        currency: "INR",
        durationDays: 30,
        features: [
            "35 Swipes Per Day",
            "1 Spotlight Per Month",
        ],
        interaction_per_day: 35,
        razorpayPeriod: "monthly",
        razorpayInterval: 1,
    },
    premium: {
        id: "premium",
        title: "Premium",
        amountInPaise: 89900,
        currency: "INR",
        durationDays: 90,
        features: [
            "50 Swipes Per Day",
            "Voice Calling to Matched Users",
        ],
        interaction_per_day: 50,
        razorpayPeriod: "monthly",
        razorpayInterval: 3,
    },
    super: {
        id: "super",
        title: "Super",
        amountInPaise: 129900,
        currency: "INR",
        durationDays: 180,
        features: [
            "75 Swipes Per Day",
            "Voice Calling to Matched Users",
            "Premium Support and profile boost",
        ],
        interaction_per_day: 75,
        razorpayPeriod: "monthly",
        razorpayInterval: 6,
    },
};

export const isValidPlanId = (planId: string): planId is SubscriptionPlanId => {
    return planId === "basic" || planId === "premium" || planId === "super";
};

