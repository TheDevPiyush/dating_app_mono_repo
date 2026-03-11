"use client";

import { useEffect, useState } from "react";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import SubscriptionDashboard from "../../components/dashboard/SubscriptionDashboard";
import { callBackend } from "../../lib/api";

export default function DashboardPage() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      router.push("/auth");
      return;
    }
    console.log(session)

    let isMounted = true;

    const syncUser = async () => {
      setSyncing(true);
      try {
        await callBackend(supabase, "/api/v1/user/me", {
          method: "POST",
          jsonBody: {},
        });
        if (isMounted) {
          setSyncError(null);
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message ?? "Failed to sync user profile."
            : "Failed to sync user profile.";
        if (isMounted) {
          setSyncError(message);
        }
      } finally {
        if (isMounted) {
          setSyncing(false);
        }
      }
    };

    void syncUser();

    return () => {
      isMounted = false;
    };
  }, [session, supabase, router]);

  if (!session) {
    return null; // Will redirect
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen pb-20">
      <div className="relative overflow-hidden">
        <header className="relative z-10 mx-auto w-full max-w-6xl px-6 pt-10 pb-6 md:px-8 lg:px-12">
          <div className="flex flex-col gap-6 rounded-3xl bg-gradient-to-r from-[#E94057] via-[#FF7EB3] to-[#4B164C] px-6 py-8 text-white shadow-2xl shadow-[#E94057]/20 md:flex-row md:items-center md:justify-between md:px-10 md:py-12">
            <div className="max-w-xl space-y-3">
              <span className="pill inline-flex bg-white/25 text-white">
                Subscription Center
              </span>
              <h1 className="text-3xl font-semibold leading-[1.1] md:text-4xl">
                Hey {session.user.email?.split("@")[0] ?? "lover"}, your premium
                perks await ✨
              </h1>
              <p className="text-sm text-white/80 md:text-base">
                Manage plans, check payment history, and stay in control of your
                Pookiey experience.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {syncing && (
                <span className="pill inline-flex bg-white/20 text-white/90">
                  Syncing profile…
                </span>
              )}
              <button
                onClick={handleSignOut}
                className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <span>Sign out</span>
              </button>
            </div>
          </div>
        </header>
      </div>

      {syncError && (
        <div className="mx-auto mt-6 w-full max-w-6xl px-6 md:px-8 lg:px-12">
          <div className="rounded-2xl border border-red-100 bg-red-50/80 p-4 text-sm font-medium text-[#C3344C] shadow-sm">
            {syncError}
          </div>
        </div>
      )}

      <div className="relative z-10 mt-10">
        <div className="mx-auto w-full max-w-6xl px-6 md:px-8 lg:px-12">
          <SubscriptionDashboard />
        </div>
      </div>
    </div>
  );
}

