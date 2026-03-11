"use client";

import { useEffect, useState, useCallback } from "react";
import {
  useSupabaseClient,
  useUser,
  useSession,
} from "@supabase/auth-helpers-react";
import {
  useSubscriptionData,
  SubscriptionPlan,
} from "../../hooks/useSubscription";
import { useRazorpay } from "../../hooks/useRazorpay";
import { callBackend } from "../../lib/api";

type AuthState = "loading" | "authenticated" | "error";

interface RazorpayOrderResponse {
  order: {
    id: string;
    amount: number;
    currency: string;
  };
  plan: SubscriptionPlan;
  razorpayKey: string;
}

/* ------------------------------------------------------------------ */
/*  Loader shown while we authenticate + fetch plans                  */
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
/*  Main page                                                          */
/* ------------------------------------------------------------------ */
export default function PayPage() {
  const supabase = useSupabaseClient();
  const session = useSession();
  const user = useUser();
  const { isReady: isRazorpayReady, error: razorpayError } = useRazorpay();

  const [authState, setAuthState] = useState<AuthState>("loading");
  const [authError, setAuthError] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  /* ---- Inline auth from query params ----------------------------- */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get("user-token-for-payment");
    const refreshToken = params.get("refresh-token");

    if (!accessToken) {
      // No token — check if user already has a session
      if (session) {
        setAuthState("authenticated");
      } else {
        // Wait a tick for Supabase to restore session from storage
        const timer = setTimeout(() => {
          setAuthState((prev) => (prev === "loading" ? "error" : prev));
          setAuthError("No payment token provided. Please open this page from the app.");
        }, 3000);
        return () => clearTimeout(timer);
      }
      return;
    }

    (async () => {
      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || accessToken,
        });

        if (error) {
          setAuthState("error");
          setAuthError("Authentication failed. Please try again from the app.");
          return;
        }

        // Strip tokens from URL
        window.history.replaceState({}, document.title, "/pay");
        setAuthState("authenticated");
      } catch {
        setAuthState("error");
        setAuthError("Something went wrong. Please try again from the app.");
      }
    })();
  }, [supabase, session]);

  /* ---- Subscription data (only after auth) ----------------------- */
  const subscriptionEnabled = authState === "authenticated" && Boolean(user);
  const { plans, current } = useSubscriptionData(subscriptionEnabled);

  /* ---- Checkout handler ------------------------------------------ */
  const handleCheckout = useCallback(
    async (plan: SubscriptionPlan) => {
      setIsProcessing(true);
      setProcessingPlanId(plan.id);
      setCheckoutError(null);

      try {
        const orderResponse = await callBackend<RazorpayOrderResponse>(
          supabase,
          "/api/v1/subscriptions/create-order",
          { method: "POST", jsonBody: { planId: plan.id } }
        );

        if (!orderResponse.data) {
          throw new Error("Failed to create Razorpay order.");
        }

        const { order, razorpayKey } = orderResponse.data;

        if (!window.Razorpay) {
          throw new Error("Razorpay is not loaded.");
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const activeSession = sessionData.session;

        const razorpay = new window.Razorpay({
          key: razorpayKey,
          amount: order.amount,
          currency: order.currency,
          name: "Pookiey Premium",
          description: `Activate ${plan.title} plan`,
          order_id: order.id,
          prefill: {
            email: user?.email ?? "",
          },
          handler: async (response: Record<string, string>) => {
            try {
              await callBackend(supabase, "/api/v1/subscriptions/verify", {
                method: "POST",
                jsonBody: response,
              });
              setPaymentSuccess(true);
              await plans.mutate();
              await current.mutate();
            } catch (err) {
              setCheckoutError(
                err instanceof Error
                  ? err.message ?? "Failed to verify payment. Contact support."
                  : "Failed to verify payment. Contact support."
              );
            }
          },
          notes: {
            planId: plan.id,
            userId: activeSession?.user?.id ?? "",
          },
          theme: {
            color: "#171717",
          },
        });

        razorpay.open();
      } catch (err) {
        setCheckoutError(
          err instanceof Error
            ? err.message ?? "Checkout failed. Please try again."
            : "Checkout failed. Please try again."
        );
      } finally {
        setIsProcessing(false);
        setProcessingPlanId(null);
      }
    },
    [supabase, user, plans, current]
  );

  /* ---- Currency formatter ---------------------------------------- */
  const amountToINR = (amountInPaise: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amountInPaise / 100);

  /* ---- Render states --------------------------------------------- */

  // 1. Auth loading
  if (authState === "loading") {
    return <PayLoader message="Authenticating to payments…" />;
  }

  // 2. Auth error
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

  // 3. Payment success
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
          <p className="mt-2 text-sm text-[#6F6077]">
            Your premium plan is now active. You can close this page and head
            back to the app.
          </p>
        </div>
      </div>
    );
  }

  // 4. Plans loading
  if (!plans.data || plans.data.length === 0) {
    return <PayLoader message="Loading plans for you…" />;
  }

  // 5. Plans ready — render cards
  const activePlanId = current.data?.snapshot?.plan ?? null;
  const errorMessage = checkoutError || razorpayError || (plans.error as Error)?.message;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF5F7] via-white to-[#F8ECF5] px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}
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

        {/* Error banner */}
        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-100 bg-red-50/80 p-4 text-center text-sm font-medium text-[#C3344C] shadow-sm">
            {errorMessage}
          </div>
        )}

        {/* Active plan badge */}
        {activePlanId && activePlanId !== "free" && (
          <div className="mb-6 rounded-2xl bg-emerald-50 p-4 text-center text-sm font-medium text-emerald-700">
            Your current plan: <strong className="uppercase">{activePlanId}</strong>
          </div>
        )}

        {/* Plan cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plans.data
            .filter((plan) => plan.id !== "free")
            .map((plan) => {
              const isCurrentPlan = activePlanId === plan.id;

              return (
                <article
                  key={plan.id}
                  className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border p-6 shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                    isCurrentPlan
                      ? "border-emerald-200 bg-emerald-50/50 shadow-emerald-100"
                      : "border-white/60 bg-white/80 shadow-[#E94057]/10"
                  }`}
                >
                  {/* Hover gradient */}
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
                      {isCurrentPlan && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[0.65rem] font-semibold text-emerald-700">
                          Active
                        </span>
                      )}
                    </div>

                    <p className="text-3xl font-semibold text-[#2A1F2D]">
                      {amountToINR(plan.amountInPaise)}
                      <span className="text-sm font-normal text-[#6F6077]">
                        {" "}
                        · {plan.durationDays} days
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
                      Boolean(
                        processingPlanId && processingPlanId !== plan.id
                      )
                    }
                    className="relative mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#2A1F2D] px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-[#2A1F2D]/20 transition hover:scale-[1.01] hover:bg-[#201523] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E94057] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isProcessing && processingPlanId === plan.id
                      ? "Processing…"
                      : isCurrentPlan
                        ? "Renew plan"
                        : "Choose plan"}
                  </button>
                </article>
              );
            })}
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-[#B49CC4]">
          Secure payments powered by Razorpay · Cancel anytime from the app
        </p>
      </div>
    </div>
  );
}
