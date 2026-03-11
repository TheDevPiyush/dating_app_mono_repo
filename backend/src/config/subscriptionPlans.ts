export type SubscriptionPlanId = "basic" | "premium" | "super" | "free";

export interface SubscriptionPlanConfig {
    id: SubscriptionPlanId;
    title: string;
    amountInPaise: number;
    currency: "INR";
    durationDays: number;
    features: string[];
    interaction_per_day: number
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlanConfig> = {
    free: {
        id: "free",
        title: "Free",
        amountInPaise: 0,
        currency: "INR",
        durationDays: 0,
        features: [],
        interaction_per_day: 1
    },
    basic: {
        id: "basic",
        title: "Basic",
        amountInPaise: 4990,
        currency: "INR",
        durationDays: 30,
        features: [
            "15 Swipes Per Day",
            "1 Spotlight Per Month",
        ],
        interaction_per_day: 15
    },
    premium: {
        id: "premium",
        title: "Premium",
        amountInPaise: 89900,
        currency: "INR",
        durationDays: 90,
        features: [
            "25 Swipes Per Day",
            "Voice Calling to Matched Users",
        ],
        interaction_per_day: 25
    },
    super: {
        id: "super",
        title: "Super",
        amountInPaise: 129900,
        currency: "INR",
        durationDays: 180,
        features: [
            "30 Swipes Per Day",
            "Voice Calling to Matched Users",
            "Premium Support and profile boost",
        ],
        interaction_per_day: 30
    },
};

export const isValidPlanId = (planId: string): planId is SubscriptionPlanId => {
    return planId === "basic" || planId === "premium" || planId === "super";
};

