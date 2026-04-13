"use client";

import { useMemo, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { callBackend } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import { Crown, Search, CalendarDays, Sparkles, User } from "lucide-react";

type PlanType = "basic" | "premium" | "super";

interface UserSearchItem {
  user_id: string;
  email: string;
  displayName?: string;
  status?: string;
  subscription?: {
    plan?: string;
    status?: string;
    endDate?: string;
  };
}

export default function PremiumGrantsPage() {
  const supabase = useSupabaseClient();
  const [email, setEmail] = useState("");
  const [users, setUsers] = useState<UserSearchItem[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSearchItem | null>(null);
  const [plan, setPlan] = useState<PlanType>("premium");
  const [validTill, setValidTill] = useState("");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [grantLoading, setGrantLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canGrant = useMemo(
    () => Boolean(selectedUser?.user_id && plan && validTill),
    [selectedUser, plan, validTill]
  );

  const searchUsers = async () => {
    if (email.trim().length < 3) {
      setError("Please enter at least 3 characters.");
      return;
    }
    try {
      setLoadingSearch(true);
      setError(null);
      setMessage(null);
      const response = await callBackend<UserSearchItem[]>(
        supabase,
        `/api/v1/admin/premium-grants/users/search?email=${encodeURIComponent(email.trim())}`,
        { method: "GET" }
      );

      if (response.success && response.data) {
        setUsers(response.data);
        if (response.data.length === 0) {
          setError("No users found with this email.");
        }
      } else {
        setUsers([]);
        setError(response.message || "Search failed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setLoadingSearch(false);
    }
  };

  const grantSubscription = async () => {
    if (!selectedUser) return;
    try {
      setGrantLoading(true);
      setError(null);
      setMessage(null);

      const response = await callBackend(supabase, "/api/v1/admin/premium-grants/grant", {
        method: "POST",
        jsonBody: {
          userId: selectedUser.user_id,
          plan,
          validTill,
        },
      });

      if (response.success) {
        setMessage(
          `Premium granted successfully to ${selectedUser.email}. Provider saved as adminprivilaged.`
        );
      } else {
        setError(response.message || "Failed to grant premium.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to grant premium.");
    } finally {
      setGrantLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 border border-white/70">
        <div className="flex items-center gap-3 mb-2">
          <Crown className="h-6 w-6 text-[#E94057]" />
          <h1 className="text-3xl font-bold text-[#2A1F2D]">Admin Premium Grant</h1>
        </div>
        <p className="text-[#6F6077]">
          Search user by email, choose subscription type and valid till date, then grant premium manually.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {message}
        </div>
      )}

      <section className="glass-card rounded-2xl p-6 border border-white/70 space-y-4">
        <h2 className="text-lg font-semibold text-[#2A1F2D] flex items-center gap-2">
          <Search className="h-5 w-5 text-[#E94057]" />
          Find User
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void searchUsers();
              }
            }}
            placeholder="Enter full email"
            className="h-11 flex-1 rounded-xl border border-white/80 bg-white/80 px-4 focus:outline-none focus:ring-2 focus:ring-[#E94057]"
          />
          <Button
            className="h-11 px-6 border-2 border-[#E94057]/70 shadow-sm hover:shadow-md"
            onClick={searchUsers}
            disabled={loadingSearch}
          >
            {loadingSearch ? "Finding..." : "Find"}
          </Button>
        </div>

        <div className="space-y-2">
          {users.map((u) => (
            <button
              key={u.user_id}
              onClick={() => setSelectedUser(u)}
              className={`w-full rounded-xl border p-3 text-left transition ${
                selectedUser?.user_id === u.user_id
                  ? "border-[#E94057]/40 bg-[#E94057]/10"
                  : "border-white/80 bg-white/60 hover:bg-white/80"
              }`}
            >
              <p className="font-semibold text-[#2A1F2D]">{u.displayName || u.email}</p>
              <p className="text-sm text-[#6F6077]">{u.email}</p>
              <p className="text-xs text-[#6F6077] mt-1">
                Current: {u.subscription?.plan || "free"} ({u.subscription?.status || "none"})
              </p>
            </button>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-6 border border-white/70 space-y-5">
        <h2 className="text-lg font-semibold text-[#2A1F2D] flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#4B164C]" />
          Grant Subscription
        </h2>

        <div className="rounded-xl border border-white/80 bg-white/60 p-3 text-sm text-[#6F6077] flex items-center gap-2">
          <User className="h-4 w-4 text-[#E94057]" />
          {selectedUser ? (
            <span>
              Selected user: <span className="font-semibold text-[#2A1F2D]">{selectedUser.email}</span>
            </span>
          ) : (
            <span>No user selected.</span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#6F6077] mb-1">Subscription Type</label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value as PlanType)}
              className="h-11 w-full rounded-xl border border-white/80 bg-white/80 px-3 focus:outline-none focus:ring-2 focus:ring-[#E94057]"
            >
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
              <option value="super">Super</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-[#6F6077] mb-1 flex items-center gap-1">
              <CalendarDays className="h-4 w-4" />
              Valid Till
            </label>
            <input
              type="date"
              value={validTill}
              onChange={(e) => setValidTill(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/80 bg-white/80 px-3 focus:outline-none focus:ring-2 focus:ring-[#E94057]"
            />
          </div>
        </div>

        <Button
          size="lg"
          className="px-6 border-2 border-[#E94057]/70 shadow-sm hover:shadow-md"
          disabled={!canGrant || grantLoading}
          onClick={grantSubscription}
        >
          {grantLoading ? "Granting..." : "Grant Premium Subscription"}
        </Button>
      </section>
    </div>
  );
}
