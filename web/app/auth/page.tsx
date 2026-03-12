"use client";

import { useEffect } from "react";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import LoginForm from "../../components/auth/LoginForm";

export default function AuthPage() {
  const { session, isLoading } = useSessionContext();
  const router = useRouter();

  // Only redirect once we KNOW there is a session (not while loading)
  useEffect(() => {
    if (!isLoading && session) {
      router.push("/dashboard");
    }
  }, [session, isLoading, router]);

  if (isLoading || session) {
    return null; // Loading or will redirect
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#E94057]/25 blur-3xl md:h-[380px] md:w-[380px]" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#4B164C]/25 blur-3xl md:h-[320px] md:w-[320px]" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#FF7EB3]/20 blur-3xl md:h-[420px] md:w-[420px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-16 px-6 pb-20 pt-16 md:flex-row md:items-center md:gap-20 md:px-8 lg:px-12">
        <div className="max-w-xl space-y-6 text-center md:text-left">
          <span className="pill inline-flex bg-white/60 text-[#E94057] shadow-sm shadow-[#E94057]/10">
            Pookiey
          </span>
          <h1 className="text-4xl font-semibold leading-[1.1] text-[#2A1F2D] md:text-5xl">
            Your vibe deserves an{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E94057] via-[#FF7EB3] to-[#4B164C]">
              unforgettable match
            </span>
          </h1>
          <p className="text-base text-[#6F6077] md:text-lg">
            Upgrade to premium, get curated boosts, and keep the chemistry
            flowing across the Pookiey universe. Sign in with Google to manage
            your subscription in seconds.
          </p>
          <div className="grid gap-4 pt-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-left shadow-md shadow-[#E94057]/10 backdrop-blur">
              <p className="text-sm font-semibold text-[#E94057]">Priority vibes</p>
              <p className="mt-1 text-sm text-[#6F6077]">
                Stay on top with weekly spotlight boosts and priority matches.
              </p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/70 p-4 text-left shadow-md shadow-[#4B164C]/10 backdrop-blur">
              <p className="text-sm font-semibold text-[#4B164C]">Control center</p>
              <p className="mt-1 text-sm text-[#6F6077]">
                View payment history, manage renewals, and adjust plans anytime.
              </p>
            </div>
          </div>
        </div>

        <LoginForm />
      </div>
    </div>
  );
}

