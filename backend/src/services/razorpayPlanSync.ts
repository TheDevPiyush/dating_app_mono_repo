import { razorpayClient } from "../config/razorpay";
import {
    SUBSCRIPTION_PLANS,
    RAZORPAY_PLAN_IDS,
    SubscriptionPlanId,
} from "../config/subscriptionPlans";

/**
 * Creates Razorpay plans for each paid subscription tier if they don't already
 * exist. Populates the in-memory RAZORPAY_PLAN_IDS map so the rest of the app
 * can look up the Razorpay plan_id for a given internal planId.
 *
 * Idempotent — safe to call on every server start.
 */
export async function syncRazorpayPlans(): Promise<void> {
    const paidPlanIds = (Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlanId[]).filter(
        (id) => id !== "free",
    );

    // Fetch existing plans from Razorpay (first 100 is enough for our 3 plans)
    let existingPlans: any[] = [];
    try {
        const result = await razorpayClient.plans.all({ count: 100 });
        existingPlans = result.items ?? [];
    } catch (err) {
        console.warn("Could not fetch existing Razorpay plans — will create fresh:", err);
    }

    for (const planId of paidPlanIds) {
        const config = SUBSCRIPTION_PLANS[planId];

        // Match by notes.internalPlanId so we never create duplicates
        const existing = existingPlans.find(
            (p: any) => p.notes?.internalPlanId === planId,
        );

        if (existing) {
            RAZORPAY_PLAN_IDS[planId] = existing.id;
            console.info(`Razorpay plan "${planId}" already exists → ${existing.id}`);
            continue;
        }

        try {
            const created = await razorpayClient.plans.create({
                period: config.razorpayPeriod,
                interval: config.razorpayInterval,
                item: {
                    name: `Pookiey ${config.title}`,
                    amount: config.amountInPaise,
                    currency: config.currency,
                    description: `${config.title} — ${config.durationDays} days`,
                },
                notes: { internalPlanId: planId },
            } as any);

            RAZORPAY_PLAN_IDS[planId] = created.id;
            console.info(`Created Razorpay plan "${planId}" → ${created.id}`);
        } catch (err) {
            console.error(`Failed to create Razorpay plan "${planId}":`, err);
        }
    }
}
