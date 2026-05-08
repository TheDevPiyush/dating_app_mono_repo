"use client";

import { useRouter } from "next/navigation";
import { useSessionContext } from "@supabase/auth-helpers-react";

const plans = [
  {
    name: "Spark",
    price: "Rs 199",
    period: "for 15 days",
    features: ["Priority visibility", "More daily interactions", "Advanced filters"],
  },
  {
    name: "Premium",
    price: "Rs 399",
    period: "for 30 days",
    features: [
      "Everything in Spark",
      "Top profile boost",
      "Faster match recommendations",
    ],
    popular: true,
  },
  {
    name: "Elite",
    price: "Rs 999",
    period: "for 90 days",
    features: [
      "Everything in Premium",
      "Highest profile ranking",
      "Dedicated priority support",
    ],
  },
];

export default function PricingClient() {
  const router = useRouter();
  const { session, isLoading } = useSessionContext();

  const handleCheckoutClick = () => {
    if (isLoading) return;
    if (!session) {
      router.push("/auth");
      return;
    }
    router.push("/dashboard#payment-plans");
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-[#fdf5f7] to-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#E94057]/10 blur-3xl md:h-[380px] md:w-[380px]" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#4B164C]/10 blur-3xl md:h-[320px] md:w-[320px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16 md:px-8">
        <header className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#E94057]">
            Premium Plans
          </p>
          <h1 className="text-4xl font-bold text-[#2A1F2D] md:text-5xl">
            Choose Your Dating Journey
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base text-[#6F6077]">
            Unlock more meaningful conversations, better visibility, and smarter
            matchmaking with a plan that fits your pace.
          </p>
        </header>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative rounded-3xl border p-7 shadow-xl backdrop-blur ${
                plan.popular
                  ? "border-[#E94057]/40 bg-gradient-to-br from-white to-[#fff2f6]"
                  : "border-white/60 bg-white/80"
              }`}
            >
              {plan.popular && (
                <span className="absolute right-5 top-5 rounded-full bg-[#E94057] px-3 py-1 text-xs font-semibold text-white">
                  Most Popular
                </span>
              )}
              <h2 className="text-2xl font-bold text-[#2A1F2D]">{plan.name}</h2>
              <p className="mt-3 text-3xl font-bold text-[#E94057]">{plan.price}</p>
              <p className="text-sm text-[#6F6077]">{plan.period}</p>
              <ul className="mt-5 space-y-3 text-sm text-[#2A1F2D]">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-3">
                    <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#E94057]" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handleCheckoutClick}
                disabled={isLoading}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#2A1F2D] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#201523] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? "Checking account..." : "Continue to Checkout"}
              </button>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
