"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { callBackend } from "../../../../lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  Area,
  ComposedChart,
  Line,
} from "recharts";

type RangeType = "today" | "weekly" | "monthly" | "all";

interface TimeSeriesPoint {
  date: string;
  calls: number;
  talkTimeSeconds: number;
  answered: number;
}

interface CallerRow {
  callerId: string;
  displayName?: string;
  photoURL?: string;
  email?: string;
  callCount: number;
  totalDurationSeconds: number;
  totalTokensSpent: number;
  firstCallAt: string;
  lastCallAt: string;
  isNewCaller: boolean;
}

interface AnalyticsData {
  range: RangeType;
  employee: {
    user_id: string;
    email: string;
    displayName?: string;
    photoURL?: string;
    profile?: unknown;
  };
  callActivity: {
    totalTalkTimeSeconds: number;
    totalTalkTimeWeeklySeconds: number;
    totalTalkTimeMonthlySeconds: number;
    longestCallSeconds: number;
    averageCallDurationSeconds: number;
    totalCallsReceived: number;
    answered: number;
    missed: number;
    rejected: number;
    voiceCalls: number;
    videoCalls: number;
    busiestHours: { hour: number; count: number }[];
    busiestDays: { day: string; count: number }[];
    peakCallTimeWindow: { hour: number; hourLabel: string; count: number };
    peakDay: string;
    peakDayCount: number;
    rangeTalkTimeSeconds?: number;
    rangeCallsCount?: number;
    rangeAnswered?: number;
    rangeLongestCallSeconds?: number;
    rangeAverageCallDurationSeconds?: number;
    rangeAnswerRatePercent?: number;
    rangeTokensEarned?: number;
  };
  timeSeries?: TimeSeriesPoint[];
  earningsAndCallers: {
    totalTokensEarned: number;
    totalRevenueGenerated: number;
    uniqueCallersCount: number;
    repeatCallersCount: number;
    rangeTokensEarned?: number;
    rangeUniqueCallersCount?: number;
    rangeRepeatCallersCount?: number;
  };
  performanceInsights: {
    callAnswerRatePercent: number;
    monthOverMonthGrowthPercent: number;
    thisMonthAnsweredCalls: number;
    lastMonthAnsweredCalls: number;
  };
  callers?: CallerRow[];
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min ? `${h}h ${min}m` : `${h}h`;
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
  });
}

const PIE_COLORS = ["#E94057", "#FF7EB3", "#4B164C", "#6F6077"];
const RANGE_OPTIONS: { value: RangeType; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "weekly", label: "Last 7 days" },
  { value: "monthly", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

export default function WomenEmployeeAnalyticsPage() {
  const supabase = useSupabaseClient();
  const params = useParams();
  const userId = params?.userId as string;
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<RangeType>("all");
  const [showNewCallersOnly, setShowNewCallersOnly] = useState(false);

  const fetchAnalytics = useCallback(
    async (rangeParam: RangeType) => {
      if (!userId) return;
      try {
        setLoading(true);
        setError(null);
        const url =
          rangeParam === "all"
            ? `/api/v1/admin/women-employees/${encodeURIComponent(userId)}/analytics`
            : `/api/v1/admin/women-employees/${encodeURIComponent(userId)}/analytics?range=${rangeParam}`;
        const response = await callBackend<AnalyticsData>(supabase, url, {
          method: "GET",
        });
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError("Failed to load analytics");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Request failed");
      } finally {
        setLoading(false);
      }
    },
    [supabase, userId]
  );

  useEffect(() => {
    void fetchAnalytics(range);
  }, [range, fetchAnalytics]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-[#6F6077]">
        Loading analytics...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-4">
        <p className="text-red-600">{error || "Employee not found"}</p>
        <Link
          href="/admin/women-employees"
          className="text-[#E94057] hover:underline"
        >
          ← Back to Women Employees
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const { employee, callActivity, timeSeries, earningsAndCallers, performanceInsights, callers = [] } = data;

  const isRangeFilter = range !== "all"; // today, weekly, monthly all show range-specific metrics
  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label ?? "All time";
  const displayTalkTime = isRangeFilter
    ? (callActivity.rangeTalkTimeSeconds ?? 0)
    : callActivity.totalTalkTimeSeconds;
  const displayCalls = isRangeFilter
    ? (callActivity.rangeCallsCount ?? 0)
    : callActivity.totalCallsReceived;
  const displayAnswered = isRangeFilter
    ? (callActivity.rangeAnswered ?? 0)
    : callActivity.answered;
  const displayLongest = isRangeFilter
    ? (callActivity.rangeLongestCallSeconds ?? 0)
    : callActivity.longestCallSeconds;
  const displayAvgDuration = isRangeFilter
    ? (callActivity.rangeAverageCallDurationSeconds ?? 0)
    : callActivity.averageCallDurationSeconds;
  const displayAnswerRate = isRangeFilter
    ? (callActivity.rangeAnswerRatePercent ?? 0)
    : performanceInsights.callAnswerRatePercent;
  const displayTokens = isRangeFilter
    ? (earningsAndCallers.rangeTokensEarned ?? callActivity.rangeTokensEarned ?? 0)
    : earningsAndCallers.totalTokensEarned;
  const displayUniqueCallers = isRangeFilter
    ? (earningsAndCallers.rangeUniqueCallersCount ?? earningsAndCallers.uniqueCallersCount)
    : earningsAndCallers.uniqueCallersCount;
  const displayRepeatCallers = isRangeFilter
    ? (earningsAndCallers.rangeRepeatCallersCount ?? earningsAndCallers.repeatCallersCount)
    : earningsAndCallers.repeatCallersCount;

  const statusPieData = [
    { name: "Answered", value: callActivity.answered, color: PIE_COLORS[0] },
    { name: "Missed", value: callActivity.missed, color: PIE_COLORS[1] },
    { name: "Rejected", value: callActivity.rejected, color: PIE_COLORS[2] },
  ].filter((d) => d.value > 0);

  const typePieData = [
    { name: "Voice", value: callActivity.voiceCalls, color: "#E94057" },
    { name: "Video", value: callActivity.videoCalls, color: "#4B164C" },
  ].filter((d) => d.value > 0);

  const hourChartData = callActivity.busiestHours.map((h) => ({
    name: `${h.hour}:00`,
    calls: h.count,
  }));

  const timeSeriesChartData =
    timeSeries?.map((t) => ({
      ...t,
      label: range === "today" ? t.date : (t as { date: string }).date.slice(0, 10).slice(5),
      talkMin: Math.round(t.talkTimeSeconds / 60),
    })) ?? [];

  const filteredCallers = showNewCallersOnly
    ? callers.filter((c) => c.isNewCaller)
    : callers;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/admin/women-employees"
          className="text-[#E94057] hover:underline font-medium"
        >
          ← Women Employees
        </Link>
        <div className="flex rounded-xl bg-white/60 p-1 border border-white/80">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                range === opt.value
                  ? "bg-[#E94057] text-white shadow"
                  : "text-[#6F6077] hover:bg-white/70"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Employee header */}
      <div className="glass-card rounded-2xl p-6 flex flex-wrap items-center gap-4">
        {employee.photoURL ? (
          <img
            src={employee.photoURL}
            alt={employee.displayName || employee.email}
            className="h-16 w-16 rounded-full object-cover ring-2 ring-white/80"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-[#E94057]/20 flex items-center justify-center ring-2 ring-white/80">
            <span className="text-2xl text-[#E94057] font-semibold">
              {(employee.displayName || employee.email)[0].toUpperCase()}
            </span>
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-[#2A1F2D]">
            {employee.displayName ||
              [
                (employee.profile as { firstName?: string })?.firstName,
                (employee.profile as { lastName?: string })?.lastName,
              ]
                .filter(Boolean)
                .join(" ") ||
              "Employee"}
          </h1>
          <p className="text-[#6F6077]">{employee.email}</p>
          <p className="text-xs text-[#6F6077] mt-1">
            Showing analytics for <strong>{rangeLabel}</strong>
          </p>
        </div>
      </div>

      {/* Hero stats strip */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: "Talk time",
            value: formatDuration(displayTalkTime),
            sub: range === "all" ? "All time" : rangeLabel,
          },
          {
            label: "Calls received",
            value: displayCalls.toLocaleString(),
            sub: `${displayAnswered} answered`,
          },
          {
            label: "Longest call",
            value: formatDuration(displayLongest),
          },
          {
            label: "Avg duration",
            value: formatDuration(displayAvgDuration),
          },
          {
            label: "Answer rate",
            value: `${displayAnswerRate}%`,
          },
          {
            label: "Tokens earned",
            value: displayTokens.toLocaleString(),
            sub: range === "all" ? "All time" : rangeLabel,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="glass-card rounded-xl p-4 text-center"
          >
            <p className="text-xs text-[#6F6077] uppercase tracking-wide mb-1">
              {stat.label}
            </p>
            <p className="text-xl font-bold text-[#2A1F2D]">{stat.value}</p>
            {stat.sub && (
              <p className="text-xs text-[#6F6077] mt-0.5">{stat.sub}</p>
            )}
          </div>
        ))}
      </section>

      {/* Time series (weekly / monthly) */}
      {timeSeriesChartData.length > 0 && (
        <section className="glass-card rounded-2xl p-6">
          <h2 className="text-lg font-bold text-[#2A1F2D] mb-2">
            📈 Activity over time
          </h2>
          <p className="text-sm text-[#6F6077] mb-4">
            {range === "today"
              ? "Call count (bars) vs total talk time in minutes (line) by hour."
              : `Call count (area) vs total talk time in minutes (line) per day for ${rangeLabel.toLowerCase()}.`}
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timeSeriesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  label={range === "today" ? { value: "Hour", position: "insideBottom", offset: -5 } : { value: "Day", position: "insideBottom", offset: -5 }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11 }}
                  label={{ value: "Number of calls", angle: -90, position: "insideLeft", style: { textAnchor: "middle" } }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  label={{ value: "Talk time (min)", angle: 90, position: "insideRight", style: { textAnchor: "middle" } }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length || label == null) return null;
                    const callCount = payload.find((p) => p.dataKey === "calls")?.value as number | undefined;
                    const talkMin = payload.find((p) => p.dataKey === "talkMin")?.value as number | undefined;
                    const timeLabel = range === "today" ? `At ${label}` : `On ${label}`;
                    return (
                      <div className="rounded-lg border border-white/80 bg-white/95 px-3 py-2 shadow-lg text-sm">
                        <p className="font-semibold text-[#2A1F2D] mb-1">{timeLabel}</p>
                        <p className="text-[#6F6077]">
                          <span className="text-[#E94057] font-medium">{callCount ?? 0} calls</span> received
                          {typeof talkMin === "number" && (
                            <>, <span className="text-[#4B164C] font-medium">{talkMin} min</span> total talk time</>
                          )}
                          .
                        </p>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Area
                  yAxisId="left"
                  type="monotone"
                  dataKey="calls"
                  fill="#E94057"
                  fillOpacity={0.3}
                  stroke="#E94057"
                  name="Call count"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="talkMin"
                  stroke="#4B164C"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Talk time (min)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Call Activity */}
      <section className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-bold text-[#2A1F2D] mb-1">
          📞 Call activity
        </h2>
        <p className="text-sm text-[#6F6077] mb-4">
          Breakdown by status, type, and busiest times ({rangeLabel})
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="rounded-xl bg-white/50 p-4">
            <p className="text-sm text-[#6F6077]">Answered / Missed / Rejected</p>
            <p className="text-lg font-bold text-[#2A1F2D]">
              {callActivity.answered} / {callActivity.missed} / {callActivity.rejected}
            </p>
          </div>
          <div className="rounded-xl bg-white/50 p-4">
            <p className="text-sm text-[#6F6077]">Voice vs Video</p>
            <p className="text-lg font-bold text-[#2A1F2D]">
              {callActivity.voiceCalls} voice / {callActivity.videoCalls} video
            </p>
          </div>
          <div className="rounded-xl bg-white/50 p-4">
            <p className="text-sm text-[#6F6077]">Peak time · Busiest day</p>
            <p className="text-lg font-bold text-[#2A1F2D]">
              {callActivity.peakCallTimeWindow.hourLabel} ({callActivity.peakCallTimeWindow.count}{" "}
              calls) · {callActivity.peakDay} ({callActivity.peakDayCount})
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <p className="text-sm font-medium text-[#6F6077] mb-2">
              Calls by hour of day
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: number) => [value, "Calls"]}
                    labelFormatter={(label) => `Hour: ${label}`}
                  />
                  <Bar
                    dataKey="calls"
                    fill="#E94057"
                    radius={[4, 4, 0, 0]}
                    name="Calls"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-[#6F6077] mb-2">
              Calls by day of week
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={callActivity.busiestDays}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value: number) => [value, "Calls"]} />
                  <Bar
                    dataKey="count"
                    fill="#4B164C"
                    radius={[4, 4, 0, 0]}
                    name="Calls"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-6">
          <div>
            <p className="text-sm font-medium text-[#6F6077] mb-2">
              Call outcome
            </p>
            {statusPieData.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={56}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-[#6F6077]">No call data yet</p>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-[#6F6077] mb-2">
              Voice vs Video
            </p>
            {typePieData.length > 0 ? (
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={36}
                      outerRadius={56}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {typePieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-[#6F6077]">No call data yet</p>
            )}
          </div>
        </div>
      </section>

      {/* Who called — callers list */}
      <section className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-bold text-[#2A1F2D] mb-1">
          👥 Who called this employee
        </h2>
        <p className="text-sm text-[#6F6077] mb-4">
          Sorted by total talk time (longest first). “New” = first call in last 30 days.
        </p>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showNewCallersOnly}
              onChange={(e) => setShowNewCallersOnly(e.target.checked)}
              className="rounded border-[#6F6077] text-[#E94057] focus:ring-[#E94057]"
            />
            <span className="text-sm text-[#6F6077]">New callers only</span>
          </label>
        </div>
        <div className="overflow-x-auto rounded-xl border border-white/60">
          <table className="w-full text-sm">
            <thead className="bg-white/50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-[#6F6077]">
                  Caller
                </th>
                <th className="px-4 py-3 text-right font-semibold text-[#6F6077]">
                  Calls
                </th>
                <th className="px-4 py-3 text-right font-semibold text-[#6F6077]">
                  Talk time
                </th>
                <th className="px-4 py-3 text-right font-semibold text-[#6F6077]">
                  Tokens
                </th>
                <th className="px-4 py-3 text-left font-semibold text-[#6F6077]">
                  First / Last call
                </th>
                <th className="px-4 py-3 text-center font-semibold text-[#6F6077]">
                  New
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/60">
              {filteredCallers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#6F6077]">
                    {showNewCallersOnly
                      ? "No new callers in the last 30 days"
                      : "No callers yet"}
                  </td>
                </tr>
              ) : (
                filteredCallers.map((c) => (
                  <tr key={c.callerId} className="hover:bg-white/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {c.photoURL ? (
                          <img
                            src={c.photoURL}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-[#6F6077]/20 flex items-center justify-center text-[#6F6077] font-medium">
                            {(c.displayName || c.email || c.callerId)[0].toUpperCase()}
                          </div>
                        )}
                        <span className="font-medium text-[#2A1F2D]">
                          {c.displayName || c.email || `User ${c.callerId.slice(0, 8)}…`}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {c.callCount}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatDuration(c.totalDurationSeconds)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {c.totalTokensSpent.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-[#6F6077]">
                      {formatShortDate(c.firstCallAt)} → {formatShortDate(c.lastCallAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.isNewCaller ? (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[#E94057]/20 text-[#E94057]">
                          New
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Earnings & Performance */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-bold text-[#2A1F2D] mb-1">
            💰 Earnings & callers
          </h2>
          <p className="text-sm text-[#6F6077] mb-4">
            {range === "all" ? "All time" : `For ${rangeLabel.toLowerCase()}`}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/50 p-4">
              <p className="text-sm text-[#6F6077]">Total tokens earned</p>
              <p className="text-xl font-bold text-[#2A1F2D]">
                {displayTokens.toLocaleString()}
              </p>
            </div>
            <div className="rounded-xl bg-white/50 p-4">
              <p className="text-sm text-[#6F6077]">Unique callers</p>
              <p className="text-xl font-bold text-[#2A1F2D]">
                {displayUniqueCallers}
              </p>
            </div>
            <div className="rounded-xl bg-white/50 p-4">
              <p className="text-sm text-[#6F6077]">Repeat callers (&gt;1 call)</p>
              <p className="text-xl font-bold text-[#2A1F2D]">
                {displayRepeatCallers}
              </p>
            </div>
          </div>
        </div>
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-bold text-[#2A1F2D] mb-4">
            📈 Performance (all time)
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/50 p-4">
              <p className="text-sm text-[#6F6077]">Call answer rate</p>
              <p className="text-xl font-bold text-[#2A1F2D]">
                {performanceInsights.callAnswerRatePercent}%
              </p>
            </div>
            <div className="rounded-xl bg-white/50 p-4">
              <p className="text-sm text-[#6F6077]">Month-over-month growth</p>
              <p className="text-xl font-bold text-[#2A1F2D]">
                {performanceInsights.monthOverMonthGrowthPercent}%
              </p>
            </div>
            <div className="rounded-xl bg-white/50 p-4">
              <p className="text-sm text-[#6F6077]">This month (answered)</p>
              <p className="text-lg font-bold text-[#2A1F2D]">
                {performanceInsights.thisMonthAnsweredCalls}
              </p>
            </div>
            <div className="rounded-xl bg-white/50 p-4">
              <p className="text-sm text-[#6F6077]">Last month (answered)</p>
              <p className="text-lg font-bold text-[#2A1F2D]">
                {performanceInsights.lastMonthAnsweredCalls}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
