"use client";

import { useMemo, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { callBackend } from "../../../lib/api";
import { Button } from "../../../components/ui/button";
import {
  ArrowRight,
  Heart,
  ThumbsDown,
  Zap,
  Link2,
  Mail,
  UserRound,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

type InteractionType = "like" | "dislike" | "superlike";

interface UserLite {
  user_id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
  };
}

function displayName(user: UserLite): string {
  return (
    user.displayName ||
    [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(" ") ||
    user.email
  );
}

export default function AdminManualFlowPage() {
  const supabase = useSupabaseClient();

  const [emailA, setEmailA] = useState("");
  const [emailB, setEmailB] = useState("");
  const [resultsA, setResultsA] = useState<UserLite[]>([]);
  const [resultsB, setResultsB] = useState<UserLite[]>([]);
  const [selectedA, setSelectedA] = useState<UserLite | null>(null);
  const [selectedB, setSelectedB] = useState<UserLite | null>(null);
  const [interactionType, setInteractionType] = useState<InteractionType>("like");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingSearchA, setLoadingSearchA] = useState(false);
  const [loadingSearchB, setLoadingSearchB] = useState(false);
  const [savingInteraction, setSavingInteraction] = useState(false);
  const [savingMatch, setSavingMatch] = useState(false);

  const canCreateInteraction = useMemo(
    () => Boolean(selectedA?.user_id && selectedB?.user_id && selectedA.user_id !== selectedB.user_id),
    [selectedA, selectedB]
  );
  const sameUserSelected = Boolean(selectedA?.user_id && selectedB?.user_id && selectedA.user_id === selectedB.user_id);

  const searchUsers = async (email: string, side: "A" | "B") => {
    if (email.trim().length < 2) {
      side === "A" ? setResultsA([]) : setResultsB([]);
      return;
    }
    try {
      setError(null);
      setMessage(null);
      side === "A" ? setLoadingSearchA(true) : setLoadingSearchB(true);
      const response = await callBackend<UserLite[]>(
        supabase,
        `/api/v1/admin/manual-flow/users/search?email=${encodeURIComponent(email.trim())}`,
        { method: "GET" }
      );
      if (response.success && response.data) {
        side === "A" ? setResultsA(response.data) : setResultsB(response.data);
      } else {
        side === "A" ? setResultsA([]) : setResultsB([]);
        setError(response.message || "Search failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      side === "A" ? setLoadingSearchA(false) : setLoadingSearchB(false);
    }
  };

  const createInteraction = async () => {
    if (!selectedA || !selectedB) return;
    try {
      setSavingInteraction(true);
      setError(null);
      setMessage(null);
      const response = await callBackend(supabase, "/api/v1/admin/manual-flow/interaction", {
        method: "POST",
        jsonBody: {
          fromUserId: selectedA.user_id,
          toUserId: selectedB.user_id,
          type: interactionType,
        },
      });
      if (response.success) {
        setMessage(`Interaction created: ${interactionType} from ${selectedA.email} to ${selectedB.email}`);
      } else {
        setError(response.message || "Failed to create interaction");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create interaction");
    } finally {
      setSavingInteraction(false);
    }
  };

  const createMatch = async () => {
    if (!selectedA || !selectedB) return;
    try {
      setSavingMatch(true);
      setError(null);
      setMessage(null);
      const response = await callBackend(supabase, "/api/v1/admin/manual-flow/match", {
        method: "POST",
        jsonBody: {
          userAId: selectedA.user_id,
          userBId: selectedB.user_id,
          initiatedBy: selectedA.user_id,
        },
      });
      if (response.success) {
        setMessage(`Matched successfully: ${selectedA.email} and ${selectedB.email}`);
      } else {
        setError(response.message || "Failed to create match");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create match");
    } finally {
      setSavingMatch(false);
    }
  };

  return (
    <div className="space-y-7">
      <section className="glass-card rounded-3xl p-6 md:p-8 border border-white/80">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-[#2A1F2D]">
              Manual Interaction & Match
            </h1>
            <p className="text-[#6F6077] mt-2 max-w-2xl">
              Pick two users by email, create an interaction (`like`, `dislike`, or
              `superlike`), then manually match them.
            </p>
          </div>
          <div className="rounded-2xl bg-gradient-to-r from-[#E94057]/15 to-[#4B164C]/15 border border-white/90 px-4 py-3">
            <p className="text-xs text-[#6F6077]">Step flow</p>
            <p className="text-sm font-semibold text-[#2A1F2D]">
              Find users → Interaction → Match
            </p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </div>
      )}

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {[
          {
            side: "A" as const,
            title: "User A (from)",
            hint: "This user sends interaction",
            value: emailA,
            setValue: setEmailA,
            search: () => searchUsers(emailA, "A"),
            results: resultsA,
            selected: selectedA,
            setSelected: setSelectedA,
            loading: loadingSearchA,
          },
          {
            side: "B" as const,
            title: "User B (to)",
            hint: "This user receives interaction",
            value: emailB,
            setValue: setEmailB,
            search: () => searchUsers(emailB, "B"),
            results: resultsB,
            selected: selectedB,
            setSelected: setSelectedB,
            loading: loadingSearchB,
          },
        ].map((card) => (
          <div
            key={card.side}
            className="glass-card rounded-3xl p-6 border border-white/80 space-y-5"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-[#2A1F2D]">{card.title}</h2>
                <p className="text-sm text-[#6F6077]">{card.hint}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-white/90 border border-white flex items-center justify-center text-[#E94057]">
                <UserRound className="h-5 w-5" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/70 p-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Mail className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#6F6077]" />
                  <input
                    type="email"
                    placeholder="Enter the full email"
                    value={card.value}
                    onChange={(e) => card.setValue(e.target.value)}
                    className="w-full h-11 rounded-xl border border-white/80 bg-white px-10 text-sm text-[#2A1F2D] placeholder:text-[#9b8ea0] focus:outline-none focus:ring-2 focus:ring-[#E94057]"
                  />
                </div>
                <Button
                  onClick={card.search}
                  disabled={card.loading}
                  className="h-11 min-w-24 px-5"
                >
                  {card.loading ? "Finding..." : "Find"}
                </Button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/80 bg-white/50 p-3">
              <p className="text-xs font-medium text-[#6F6077] mb-2">Search results</p>
              <div className="max-h-64 overflow-auto space-y-2 pr-1">
                {card.results.map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => card.setSelected(u)}
                    className={`w-full text-left rounded-xl border p-3 transition ${
                      card.selected?.user_id === u.user_id
                        ? "border-[#E94057]/40 bg-[#E94057]/10"
                        : "border-white/90 bg-white hover:border-[#E94057]/30"
                    }`}
                  >
                    <p className="font-semibold text-[#2A1F2D]">{displayName(u)}</p>
                    <p className="text-sm text-[#6F6077]">{u.email}</p>
                    <p className="text-xs text-[#6F6077]/80 mt-1">ID: {u.user_id}</p>
                  </button>
                ))}
                {card.results.length === 0 && (
                  <p className="text-sm text-[#6F6077] py-4 text-center">
                    No results yet. Search with full email.
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="glass-card rounded-3xl p-6 md:p-7 border border-white/80 space-y-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#E94057]" />
          <h3 className="text-xl font-semibold text-[#2A1F2D]">Create flow action</h3>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/60 p-4 flex flex-wrap items-center gap-3 text-sm">
          <span className="text-[#6F6077]">From:</span>
          <span className="font-semibold text-[#2A1F2D]">
            {selectedA ? selectedA.email : "Not selected"}
          </span>
          <ArrowRight className="h-4 w-4 text-[#6F6077]" />
          <span className="text-[#6F6077]">To:</span>
          <span className="font-semibold text-[#2A1F2D]">
            {selectedB ? selectedB.email : "Not selected"}
          </span>
        </div>

        {sameUserSelected && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-700">
            Please select two different users.
          </div>
        )}

        <div>
          <p className="text-sm font-medium text-[#2A1F2D] mb-3">Interaction type</p>
          <div className="flex flex-wrap gap-3">
            {[
              {
                value: "like",
                icon: Heart,
                label: "Like",
                activeClass: "bg-[#E94057] text-white border-[#E94057]",
              },
              {
                value: "dislike",
                icon: ThumbsDown,
                label: "Dislike",
                activeClass: "bg-[#4B164C] text-white border-[#4B164C]",
              },
              {
                value: "superlike",
                icon: Zap,
                label: "Superlike",
                activeClass: "bg-[#FF7EB3] text-white border-[#FF7EB3]",
              },
            ].map((item) => {
              const Icon = item.icon;
              const active = interactionType === item.value;
              return (
                <button
                  key={item.value}
                  onClick={() => setInteractionType(item.value as InteractionType)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
                    active
                      ? item.activeClass
                      : "border-white/90 bg-white text-[#2A1F2D] hover:border-[#E94057]/30"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            size="lg"
            className="px-6"
            disabled={!canCreateInteraction || savingInteraction}
            onClick={createInteraction}
          >
            {savingInteraction ? "Creating interaction..." : "Create interaction"}
          </Button>
          <Button
            size="lg"
            variant="secondary"
            className="px-6 bg-[#4B164C] text-white hover:bg-[#4B164C]/90"
            disabled={!canCreateInteraction || savingMatch}
            onClick={createMatch}
          >
            <Link2 className="h-4 w-4" />
            {savingMatch ? "Matching..." : "Match both users"}
          </Button>
        </div>
      </section>
    </div>
  );
}
