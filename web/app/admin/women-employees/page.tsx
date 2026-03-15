"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { callBackend } from "../../../lib/api";
import Link from "next/link";

interface WomenEmployee {
  user_id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    location?: { city?: string; country?: string };
  };
}

interface WomenEmployeesResponse {
  users: WomenEmployee[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function WomenEmployeesPage() {
  const supabase = useSupabaseClient();
  const [employees, setEmployees] = useState<WomenEmployee[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      const response = await callBackend<WomenEmployeesResponse>(
        supabase,
        `/api/v1/admin/women-employees?${params}`,
        { method: "GET" }
      );
      if (response.success && response.data) {
        setEmployees(response.data.users);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      console.error("Failed to fetch women employees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchEmployees();
  }, [pagination.page, pagination.limit]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: "bg-green-100 text-green-700",
      banned: "bg-red-100 text-red-700",
      deleted: "bg-gray-100 text-gray-700",
      suspended: "bg-yellow-100 text-yellow-700",
    };
    return (
      <span className={`pill ${colors[status] || "bg-gray-100 text-gray-700"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-[#2A1F2D] mb-2">
          Women Employees
        </h1>
        <p className="text-[#6F6077]">
          @pookiey.com users with profile.gender = female. Click a row to view
          call analytics.
        </p>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#6F6077]">
            Loading employees...
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/50 border-b border-white/60">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6F6077] uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6F6077] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6F6077] uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6F6077] uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6F6077] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/60">
                  {employees.map((user) => (
                    <tr
                      key={user.user_id}
                      className="hover:bg-white/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {user.photoURL ? (
                            <img
                              src={user.photoURL}
                              alt={user.displayName || user.email}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-[#E94057]/20 flex items-center justify-center">
                              <span className="text-[#E94057] font-semibold">
                                {(user.displayName || user.email)[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-[#2A1F2D]">
                              {user.displayName ||
                                [user.profile?.firstName, user.profile?.lastName]
                                  .filter(Boolean)
                                  .join(" ") ||
                                "No name"}
                            </div>
                            <div className="text-sm text-[#6F6077]">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                      <td className="px-6 py-4 text-sm text-[#6F6077]">
                        {user.profile?.location?.city || "—"}
                        {user.profile?.location?.country &&
                          `, ${user.profile.location.country}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6F6077]">
                        {formatDate(user.lastLoginAt)}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/women-employees/${encodeURIComponent(user.user_id)}`}
                          className="text-sm text-[#E94057] hover:underline font-medium"
                        >
                          View Analytics
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!loading && employees.length === 0 && (
              <div className="p-8 text-center text-[#6F6077]">
                <p className="text-lg mb-2">No women employees found</p>
                <p className="text-sm">
                  Users must have email containing @pookiey.com and
                  profile.gender = female
                </p>
              </div>
            )}

            {!loading && pagination.total > 0 && (
              <div className="px-4 md:px-6 py-4 border-t border-white/60 flex flex-wrap items-center justify-between gap-4">
                <div className="text-sm text-[#6F6077]">
                  Showing{" "}
                  <span className="font-semibold text-[#2A1F2D]">
                    {(pagination.page - 1) * pagination.limit + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-semibold text-[#2A1F2D]">
                    {Math.min(
                      pagination.page * pagination.limit,
                      pagination.total
                    )}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-[#2A1F2D]">
                    {pagination.total}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setPagination((p) => ({ ...p, page: p.page - 1 }))
                    }
                    disabled={pagination.page <= 1}
                    className="px-4 py-2 rounded-xl bg-white/50 text-sm font-medium text-[#6F6077] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/70"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-[#6F6077]">
                    Page {pagination.page} of {pagination.pages}
                  </span>
                  <button
                    onClick={() =>
                      setPagination((p) => ({ ...p, page: p.page + 1 }))
                    }
                    disabled={pagination.page >= pagination.pages}
                    className="px-4 py-2 rounded-xl bg-white/50 text-sm font-medium text-[#6F6077] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/70"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
