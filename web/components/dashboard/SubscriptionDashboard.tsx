"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistance, format } from "date-fns";
import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import {
  useSubscriptionData,
  SubscriptionPlan,
} from "../../hooks/useSubscription";
import { useRazorpay } from "../../hooks/useRazorpay";
import { callBackend } from "../../lib/api";

type SnapshotStatus = "none" | "pending" | "active" | "expired" | "cancelled";

interface RazorpayOrderResponse {
  order: {
    id: string;
    amount: number;
    currency: string;
  };
  plan: SubscriptionPlan;
  razorpayKey: string;
}

export default function SubscriptionDashboard() {
  const user = useUser();
  const supabase = useSupabaseClient();
  const { isReady: isRazorpayReady, error: razorpayError } = useRazorpay();
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const subscriptionEnabled = Boolean(user);
  const { plans, current, payments } = useSubscriptionData(subscriptionEnabled);

  const currentData = current.data;
  const subscriptionSnapshot = currentData?.snapshot ?? null;
  const activePlan = currentData?.subscription ?? null;

  const formattedActivePlan = useMemo(() => {
    if (!activePlan) {
      return null;
    }

    return {
      ...activePlan,
      startDate: new Date(activePlan.startDate),
      endDate: new Date(activePlan.endDate),
    };
  }, [activePlan]);

  const handleCheckout = async (plan: SubscriptionPlan) => {
    setIsProcessing(true);
    setProcessingPlanId(plan.id);
    setCheckoutError(null);

    try {
      const orderResponse = await callBackend<RazorpayOrderResponse>(
        supabase,
        "/api/v1/subscriptions/create-order",
        {
          method: "POST",
          jsonBody: { planId: plan.id },
        }
      );

      if (!orderResponse.data) {
        throw new Error("Failed to create Razorpay order.");
      }

      const { order, razorpayKey } = orderResponse.data;

      if (!window.Razorpay) {
        throw new Error("Razorpay is not loaded.");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

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
            await plans.mutate();
            await current.mutate();
            await payments.mutate();
          } catch (error) {
            if (error instanceof Error) {
              setCheckoutError(
                error.message ?? "Failed to verify payment. Contact support."
              );
            } else {
              setCheckoutError(
                "Failed to verify payment. Contact support."
              );
            }
          }
        },
        notes: {
          planId: plan.id,
          userId: session?.user?.id ?? "",
        },
        theme: {
          color: "#171717",
        },
      });

      razorpay.open();
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message ?? "Checkout failed. Please try again."
          : "Checkout failed. Please try again."
      );
    } finally {
      setIsProcessing(false);
      setProcessingPlanId(null);
    }
  };

  useEffect(() => {
    const hash = window.location.hash;

    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, []);

  // Auto-scroll to payment plans when user is redirected from mobile app
  useEffect(() => {
    const isRedirect = sessionStorage.getItem("auto-login-redirect");
    if (!isRedirect) return;

    if (plans.data && plans.data.length > 0) {
      sessionStorage.removeItem("auto-login-redirect");
      const el = document.getElementById("payment-plans");
      if (el) {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
  }, [plans.data]);


  const amountToINR = (amountInPaise: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amountInPaise / 100);

  const dataError = plans.error || current.error || payments.error;

  const status = (subscriptionSnapshot?.status ?? "none") as SnapshotStatus;
  const snapshotPlanLabel = subscriptionSnapshot?.plan
    ? subscriptionSnapshot.plan.toUpperCase()
    : null;
  const snapshotStartDate = subscriptionSnapshot?.startDate
    ? new Date(subscriptionSnapshot.startDate)
    : null;
  const snapshotEndDate = subscriptionSnapshot?.endDate
    ? new Date(subscriptionSnapshot.endDate)
    : null;
  const snapshotLastPayment = subscriptionSnapshot?.lastPaymentAt
    ? new Date(subscriptionSnapshot.lastPaymentAt)
    : null;

  const statusStyles: Record<
    SnapshotStatus,
    {
      label: string;
      badgeClass: string;
      headline: string;
      description: string;
    }
  > = {
    active: {
      label: "Active",
      badgeClass: "bg-emerald-100 text-emerald-700",
      headline: snapshotPlanLabel
        ? `Your ${snapshotPlanLabel} plan is live`
        : "Your subscription is active",
      description: "Enjoy uninterrupted boosts, premium filters, and priority matches.",
    },
    pending: {
      label: "Pending",
      badgeClass: "bg-amber-100 text-amber-700",
      headline: "We’re confirming your payment",
      description: "Sit tight! Razorpay is processing your payment details.",
    },
    expired: {
      label: "Expired",
      badgeClass: "bg-rose-100 text-rose-700",
      headline: "Your subscription has expired",
      description: "Renew now to get back the premium spark and standout features.",
    },
    cancelled: {
      label: "Cancelled",
      badgeClass: "bg-zinc-100 text-zinc-600",
      headline: "Subscription cancelled",
      description: "Reactivate any plan to continue enjoying premium benefits.",
    },
    none: {
      label: "No plan yet",
      badgeClass: "bg-[#E94057]/10 text-[#E94057]",
      headline: "Discover your perfect plan",
      description: "Choose the vibe that matches your energy and start flirting in style.",
    },
  };

  const statusConfig = statusStyles[status];

  return (
    <div className="flex w-full flex-col gap-12 pb-12">
      {dataError && (
        <div className="rounded-3xl border border-red-100 bg-red-50/80 p-4 text-sm font-medium text-[#C3344C] shadow-sm">
          {(dataError as Error).message ??
            "Failed to load subscription data. Please refresh."}
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="glass-card rounded-3xl p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className={`pill ${statusConfig.badgeClass}`}>
              {statusConfig.label}
            </span>
            {snapshotPlanLabel && (
              <span className="pill bg-[#E94057]/10 text-[#E94057]">
                {snapshotPlanLabel}
              </span>
            )}
          </div>
          <h2 className="mt-6 text-3xl font-semibold leading-tight text-[#2A1F2D]">
            {statusConfig.headline}
          </h2>
          <p className="mt-3 text-sm text-[#6F6077] md:text-base">
            {statusConfig.description}
          </p>

          <dl className="mt-8 grid gap-6 text-sm text-[#6F6077] md:grid-cols-2">
            <div>
              <dt className="uppercase tracking-[0.18em] text-[0.65rem] text-[#B49CC4]">
                Start date
              </dt>
              <dd className="mt-1 text-base font-semibold text-[#2A1F2D]">
                {snapshotStartDate
                  ? format(snapshotStartDate, "dd MMM yyyy")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.18em] text-[0.65rem] text-[#B49CC4]">
                Renewal
              </dt>
              <dd className="mt-1 text-base font-semibold text-[#2A1F2D]">
                {snapshotEndDate
                  ? `In ${formatDistance(snapshotEndDate, new Date(), {
                    addSuffix: false,
                  })}`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.18em] text-[0.65rem] text-[#B49CC4]">
                Last payment
              </dt>
              <dd className="mt-1 text-base font-semibold text-[#2A1F2D]">
                {snapshotLastPayment
                  ? format(snapshotLastPayment, "dd MMM yyyy")
                  : status === "pending"
                    ? "Processing…"
                    : "—"}
              </dd>
            </div>
            <div>
              <dt className="uppercase tracking-[0.18em] text-[0.65rem] text-[#B49CC4]">
                Auto renew
              </dt>
              <dd className="mt-1 text-base font-semibold text-[#2A1F2D]">
                {subscriptionSnapshot?.autoRenew === false ? "Off" : "On"}
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br from-[#4B164C] via-[#7B1E7A] to-[#E94057] p-8 text-white shadow-[0_25px_60px_-30px_rgba(75,22,76,0.65)]">
          <div className="space-y-4">
            <span className="pill inline-flex bg-white/20 text-white/90">
              Perks snapshot
            </span>
            <p className="text-2xl font-semibold leading-tight md:text-[32px]">
              Make meaningful connections with premium-only vibes 💘
            </p>
          </div>
          <ul className="mt-6 space-y-4 text-sm text-white/85 md:text-base">
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-white">
                1
              </span>
              <p>Unlimited rewinds, enhanced filters, and priority likes.</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-white">
                2
              </span>
              <p>Weekly boost to stay at the top of everyone’s deck.</p>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/25 text-white">
                3
              </span>
              <p>See who liked you instantly and plan your next move.</p>
            </li>
          </ul>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#2A1F2D]">
              Choose the plan to match your vibe
              <a href="/dashboard#payment-plans">try</a>
            </h2>
            <p className="text-sm text-[#6F6077]">
              Switch plans anytime — payments happen securely through Razorpay.
            </p>
          </div>
        </div>

        <div id="payment-plans" className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {plans.data
            ?.filter((plan) => plan.id !== "free")
            .map((plan) => (
              <article
                key={plan.id}
                className="group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-[#E94057]/10 transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#E94057]/12 via-transparent to-[#4B164C]/12" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#B49CC4]">
                      {plan.title}
                    </p>
                    {plan.id === "premium" && (
                      <span className="pill bg-[#E94057]/10 text-[#E94057]">
                        Most loved
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
                          <> · {plan.interaction_per_day} interactions/day</>
                        )}
                    </span>
                  </p>
                  <ul className="space-y-2 text-sm text-[#6F6077]">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#E94057]/15 text-xs text-[#E94057]"
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
                  className="mt-6 inline-flex items-center justify-center rounded-2xl bg-[#2A1F2D] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#2A1F2D]/20 transition hover:scale-[1.01] hover:bg-[#201523] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E94057] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProcessing && processingPlanId === plan.id
                    ? "Processing..."
                    : "Choose plan"}
                </button>
              </article>
            ))}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-[#2A1F2D]">
              Recent payments
            </h2>
            <p className="text-sm text-[#6F6077]">
              Track your premium history and download receipts from Razorpay.
            </p>
          </div>
        </div>
        <div className="overflow-hidden rounded-3xl border border-white/60 bg-white/85 shadow-lg shadow-[#4B164C]/10">
          <table className="min-w-full divide-y divide-[#F0E7F4]">
            <thead className="bg-[#FCF3FA]/60">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-[#B49CC4]">
                  Plan
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-[#B49CC4]">
                  Amount
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-[#B49CC4]">
                  Status
                </th>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-[0.2em] text-[#B49CC4]">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F5ECF6]">
              {payments.data?.length ? (
                payments.data.map((payment) => (
                  <tr key={payment._id}>
                    <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold uppercase tracking-[0.08em] text-[#2A1F2D]">
                      {payment.plan}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-[#6F6077]">
                      {amountToINR(payment.amount)}
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm capitalize text-[#6F6077]">
                      <span
                        className={`pill ${payment.status === "captured"
                            ? "bg-emerald-100 text-emerald-700"
                            : payment.status === "failed"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-[#E94057]/10 text-[#E94057]"
                          }`}
                      >
                        {payment.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-sm text-[#6F6077]">
                      {format(new Date(payment.createdAt), "dd MMM yyyy")}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-5 py-8 text-center text-sm text-[#6F6077]"
                    colSpan={4}
                  >
                    No payments yet. Your future premium adventures will appear
                    here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {(checkoutError || razorpayError) && (
        <div className="rounded-3xl border border-red-100 bg-red-50/80 p-4 text-sm font-medium text-[#C3344C] shadow-sm">
          {checkoutError ?? razorpayError}
        </div>
      )}
    </div>
  );
}

