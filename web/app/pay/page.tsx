"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { SubscriptionPlan } from "../../hooks/useSubscription";
import { useRazorpay } from "../../hooks/useRazorpay";
import { callBackend } from "../../lib/api";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const STORAGE_KEY = "pay-page-access-token";
const REFRESH_KEY = "pay-page-refresh-token";

const PLANS_CACHE_KEY = "pay-page-plans-cache";
const ACTIVE_PLAN_CACHE_KEY = "pay-page-active-plan";

const VERIFY_MAX_RETRIES = 5;
const VERIFY_RETRY_DELAY_MS = 1200;

type AuthState = "loading" | "authenticated" | "error";

interface RazorpayOrderResponse {
    order: { id: string; amount: number; currency: string };
    plan: SubscriptionPlan;
    razorpayKey: string;
}

// Matches the verifyOrder response shape from the controller
interface VerifyOrderResponse {
    payment: {
        status: "created" | "authorized" | "captured" | "failed" | "refunded" | "abandoned";
        plan: string;
        razorpayOrderId: string;
        razorpayPaymentId?: string;
    };
    subscription: {
        plan: string;
        status: string;
        startDate: string;
        endDate: string;
    } | null;
    plan: SubscriptionPlan | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/* ------------------------------------------------------------------ */
/*  Loader                                                              */
/* ------------------------------------------------------------------ */
function PayLoader({ message }: { message: string }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#FFF5F7] via-white to-[#F8ECF5] px-6">
            <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 animate-bounce rounded-full bg-[#E94057] [animation-delay:0ms]" />
                    <span className="inline-block h-3 w-3 animate-bounce rounded-full bg-[#FF7EB3] [animation-delay:150ms]" />
                    <span className="inline-block h-3 w-3 animate-bounce rounded-full bg-[#4B164C] [animation-delay:300ms]" />
                </div>
                <div className="text-center">
                    <p className="text-lg font-semibold text-[#2A1F2D]">{message}</p>
                    <p className="mt-1 text-sm text-[#6F6077]">
                        Hang tight while we set everything up for you ✨
                    </p>
                </div>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                           */
/* ------------------------------------------------------------------ */
export default function PayPage() {
    console.log("PayPage render");

    const [supabase] = useState<SupabaseClient>(() =>
        createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                storageKey: "sb-pay-auth-token",
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
            },
        })
    );

    const { isReady: isRazorpayReady, error: razorpayError } = useRazorpay();

    const isFirstLoad = useRef(
        typeof window === "undefined" ? true : !sessionStorage.getItem(STORAGE_KEY)
    );

    const [authState, setAuthState] = useState<AuthState>(() => {
        if (typeof window === "undefined") return "loading";
        return sessionStorage.getItem(STORAGE_KEY) ? "authenticated" : "loading";
    });

    const [authError, setAuthError] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [plans, setPlans] = useState<SubscriptionPlan[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            const cached = sessionStorage.getItem(PLANS_CACHE_KEY);
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });
    const [activePlanId, setActivePlanId] = useState<string | null>(() => {
        if (typeof window === "undefined") return null;
        return sessionStorage.getItem(ACTIVE_PLAN_CACHE_KEY);
    });
    const plansLoadedOnce = useRef(
        typeof window !== "undefined" && !!sessionStorage.getItem(PLANS_CACHE_KEY)
    );
    const [plansLoading, setPlansLoading] = useState(
        () => typeof window === "undefined" || !sessionStorage.getItem(PLANS_CACHE_KEY)
    );
    const [plansError, setPlansError] = useState<string | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [verifiedPlan, setVerifiedPlan] = useState<SubscriptionPlan | null>(null);

    const didAuth = useRef(false);

    /* ---- Auth -------------------------------------------------------- */
    useEffect(() => {
        if (didAuth.current) return;
        didAuth.current = true;

        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get("user-token-for-payment");
        const refreshToken = params.get("refresh-token");

        if (accessToken) {
            sessionStorage.setItem(STORAGE_KEY, accessToken);
            if (refreshToken) sessionStorage.setItem(REFRESH_KEY, refreshToken);
            window.history.replaceState({}, document.title, "/pay");
        }

        const storedAccess = sessionStorage.getItem(STORAGE_KEY);
        const storedRefresh = sessionStorage.getItem(REFRESH_KEY);

        if (!storedAccess) {
            setAuthState("error");
            setAuthError("No payment token provided. Please open this page from the app.");
            return;
        }

        (async () => {
            try {
                const { data, error } = await supabase.auth.setSession({
                    access_token: storedAccess,
                    refresh_token: storedRefresh || storedAccess,
                });

                if (error || !data.user) {
                    sessionStorage.removeItem(STORAGE_KEY);
                    sessionStorage.removeItem(REFRESH_KEY);
                    setAuthState("error");
                    setAuthError("Authentication failed. Please try again from the app.");
                    return;
                }

                setUser(data.user);
                setAuthState((prev) => (prev === "authenticated" ? prev : "authenticated"));
            } catch {
                setAuthState("error");
                setAuthError("Something went wrong. Please try again from the app.");
            }
        })();
    }, [supabase]);

    /* ---- Fetch plans (runs exactly once) ------------------------------ */
    useEffect(() => {
        if (authState !== "authenticated") return;
        if (plansLoadedOnce.current) return; // already loaded or restored from cache

        let cancelled = false;

        (async () => {
            try {
                const [plansRes, currentRes] = await Promise.all([
                    callBackend<SubscriptionPlan[]>(supabase, "/api/v1/subscriptions/plans"),
                    callBackend<unknown>(supabase, "/api/v1/subscriptions/current"),
                ]);

                if (cancelled) return;

                const fetchedPlans = plansRes.data ?? [];
                setPlans(fetchedPlans);

                const snapshot = (
                    currentRes.meta as {
                        subscriptionSnapshot?: { plan?: string | null };
                    }
                )?.subscriptionSnapshot;
                const planId = snapshot?.plan ?? null;
                setActivePlanId(planId);

                // Persist so a remount (e.g. strict-mode or navigation) is instant
                try {
                    sessionStorage.setItem(PLANS_CACHE_KEY, JSON.stringify(fetchedPlans));
                    if (planId) sessionStorage.setItem(ACTIVE_PLAN_CACHE_KEY, planId);
                } catch { /* quota exceeded – non-critical */ }

                plansLoadedOnce.current = true;
            } catch (err) {
                if (!cancelled) {
                    setPlansError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load plans. Please try again."
                    );
                }
            } finally {
                if (!cancelled) setPlansLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [authState, supabase]);

    /* ---- Verify with retry ------------------------------------------ */
    // Webhook and verifyOrder race slightly — poll until captured or give up
    const verifyWithRetry = useCallback(
        async (razorpayResponse: Record<string, string>): Promise<VerifyOrderResponse> => {
            let lastError: Error | null = null;

            for (let attempt = 0; attempt < VERIFY_MAX_RETRIES; attempt++) {
                if (attempt > 0) await sleep(VERIFY_RETRY_DELAY_MS);

                try {
                    const res = await callBackend<VerifyOrderResponse>(
                        supabase,
                        "/api/v1/subscriptions/verify",
                        {
                            method: "POST",
                            // Controller expects: razorpay_order_id, razorpay_payment_id, razorpay_signature
                            jsonBody: {
                                razorpay_order_id: razorpayResponse.razorpay_order_id,
                                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                                razorpay_signature: razorpayResponse.razorpay_signature,
                            },
                        }
                    );

                    if (!res.data) throw new Error("Empty response from verify endpoint");

                    // If webhook hasn't fired yet, payment is still pending — retry
                    if (res.data.payment.status === "captured") {
                        return res.data;
                    }

                    lastError = new Error("Payment not yet confirmed, retrying…");
                } catch (err) {
                    lastError = err instanceof Error ? err : new Error("Verification failed");
                }
            }

            throw lastError ?? new Error("Payment verification timed out. Contact support.");
        },
        [supabase]
    );

    /* ---- Checkout ---------------------------------------------------- */
    const handleCheckout = useCallback(
        async (plan: SubscriptionPlan) => {
            setIsProcessing(true);
            setProcessingPlanId(plan.id);
            setCheckoutError(null);

            console.log(plan)

            try {
                const orderResponse = await callBackend<RazorpayOrderResponse>(
                    supabase,
                    "/api/v1/subscriptions/create-order",
                    { method: "POST", jsonBody: { planId: plan.id } }
                );

                if (!orderResponse.data) throw new Error("Failed to create Razorpay order.");

                const { order, razorpayKey } = orderResponse.data;

                if (!window.Razorpay) throw new Error("Razorpay is not loaded.");

                const razorpay = new window.Razorpay({
                    key: razorpayKey,
                    amount: order.amount,
                    currency: order.currency,
                    name: "Pookiey Premium",
                    description: `Activate ${plan.title} plan`,
                    order_id: order.id,
                    prefill: { email: user?.email ?? "" },

                    config: {
                        display: {
                            blocks: {
                                utib: { name: "Pay via UPI", instruments: [{ method: "upi" }] },
                                card: { name: "Pay via Card", instruments: [{ method: "card" }] },
                                wallet: { name: "Pay via Wallet", instruments: [{ method: "wallet" }] },
                            },
                            sequence: ["block.utib", "block.card", "block.wallet"],
                            preferences: { show_default_blocks: false },
                        },
                    },

                    handler: async (response: Record<string, string>) => {
                        try {
                            const verified = await verifyWithRetry(response);

                            sessionStorage.removeItem(STORAGE_KEY);
                            sessionStorage.removeItem(REFRESH_KEY);

                            setVerifiedPlan(verified.plan ?? plan);
                            setActivePlanId(verified.subscription?.plan ?? plan.id);
                            setPaymentSuccess(true);
                        } catch (err) {
                            setCheckoutError(
                                err instanceof Error
                                    ? err.message
                                    : "Failed to verify payment. Contact support."
                            );
                        }
                    },

                    notes: { planId: plan.id, userId: user?.id ?? "" },
                    theme: { color: "#E94057" },
                });

                razorpay.open();
            } catch (err) {
                setCheckoutError(
                    err instanceof Error
                        ? err.message
                        : "Checkout failed. Please try again."
                );
            } finally {
                setIsProcessing(false);
                setProcessingPlanId(null);
            }
        },
        [supabase, user, verifyWithRetry]
    );

    /* ---- Currency formatter ----------------------------------------- */
    const amountToINR = (amountInPaise: number) =>
        new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
            amountInPaise / 100
        );

    /* ---- Render states ----------------------------------------------- */
    // Only show auth loader on the very first visit when we have no cached plans
    if (authState === "loading" && isFirstLoad.current && !plansLoadedOnce.current) {
        return <PayLoader message="Authenticating to payments…" />;
    }

    if (authState === "error") {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#FFF5F7] via-white to-[#F8ECF5] px-6">
                <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-8 text-center shadow-lg">
                    <p className="text-lg font-semibold text-[#C3344C]">
                        {authError ?? "Authentication failed"}
                    </p>
                    <p className="mt-2 text-sm text-[#6F6077]">
                        Please go back to the app and try again.
                    </p>
                </div>
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#FFF5F7] via-white to-[#F8ECF5] px-6">
                <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                        <span className="text-3xl">🎉</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-[#2A1F2D]">
                        Payment successful!
                    </h2>
                    {verifiedPlan && (
                        <p className="mt-1 text-sm font-medium text-[#E94057] uppercase tracking-wide">
                            {verifiedPlan.title} plan activated
                        </p>
                    )}
                    <p className="mt-2 text-sm text-[#6F6077]">
                        Your premium plan is now active. You can close this page and head
                        back to the app.
                    </p>
                </div>
            </div>
        );
    }

    if (plansLoading && plans.length === 0 && !plansLoadedOnce.current) {
        return <PayLoader message="Loading plans for you…" />;
    }

    const errorMessage = checkoutError || razorpayError || plansError;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#FFF5F7] via-white to-[#F8ECF5] px-4 py-8 sm:px-6">
            <div className="mx-auto w-full max-w-3xl">
                <div className="mb-8 text-center">
                    <span className="mb-3 inline-flex rounded-full bg-[#E94057]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#E94057]">
                        Pookiey Premium
                    </span>
                    <h1 className="text-2xl font-semibold leading-tight text-[#2A1F2D] sm:text-3xl">
                        Choose the plan that matches&nbsp;your&nbsp;vibe
                    </h1>
                    <p className="mt-2 text-sm text-[#6F6077]">
                        Payments happen securely through Razorpay.
                    </p>
                </div>

                {errorMessage && (
                    <div className="mb-6 rounded-2xl border border-red-100 bg-red-50/80 p-4 text-center text-sm font-medium text-[#C3344C] shadow-sm">
                        {errorMessage}
                    </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {plansLoading && plans.length === 0 && !plansLoadedOnce.current
                        ? [1, 2, 3].map((n) => (
                            <div
                                key={n}
                                className="h-72 animate-pulse rounded-3xl bg-white/60 shadow-lg"
                            />
                        ))
                        : plans
                            .filter((plan) => plan.id !== "free")
                            .map((plan) => {
                                return (
                                    <article
                                        key={plan.id}
                                        className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-6 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-2xl $
                                            : "border-white/60 bg-white/80 shadow-[#E94057]/10"`}
                                    >
                                        <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                                            <div className="absolute inset-0 bg-gradient-to-br from-[#E94057]/12 via-transparent to-[#4B164C]/12" />
                                        </div>

                                        <div className="relative space-y-3">
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B49CC4]">
                                                    {plan.title}
                                                </p>
                                                {plan.id === "premium" && (
                                                    <span className="rounded-full bg-[#E94057]/10 px-2.5 py-0.5 text-[0.65rem] font-semibold text-[#E94057]">
                                                        Most loved
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-3xl font-semibold text-[#2A1F2D]">
                                                {amountToINR(plan.amountInPaise)}
                                                <span className="text-sm font-normal text-[#6F6077]">
                                                    {" "}· {plan.durationDays} days
                                                    {typeof plan.interaction_per_day === "number" &&
                                                        plan.interaction_per_day > 0 && (
                                                            <> · {plan.interaction_per_day}/day</>
                                                        )}
                                                </span>
                                            </p>

                                            <ul className="space-y-2 text-sm text-[#6F6077]">
                                                {plan.features.map((feature) => (
                                                    <li key={feature} className="flex items-center gap-2">
                                                        <span
                                                            aria-hidden
                                                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E94057]/15 text-xs text-[#E94057]"
                                                        >
                                                            ✓
                                                        </span>
                                                        {feature}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <button
                                            onClick={() => handleCheckout(plan)}
                                            disabled={
                                                !isRazorpayReady ||
                                                isProcessing ||
                                                Boolean(processingPlanId && processingPlanId !== plan.id)
                                            }
                                            className="relative mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#2A1F2D] px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-[#2A1F2D]/20 transition hover:scale-[1.01] hover:bg-[#201523] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E94057] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isProcessing && processingPlanId === plan.id
                                                ? "Processing…"
                                                : "Choose plan"
                                            }
                                        </button>
                                    </article>
                                );
                            })}
                </div>

                <p className="mt-8 text-center text-xs text-[#B49CC4]">
                    Secure payments powered by Razorpay · Cancel anytime from the app
                </p>
            </div>
        </div>
    );
}