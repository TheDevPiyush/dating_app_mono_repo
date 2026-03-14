"use client";

import { useEffect, useState } from "react";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { callBackend } from "../../../lib/api";
import Link from "next/link";

interface User {
  user_id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
  subscription?: {
    status: string;
    plan?: string;
  };
  profile?: {
    location?: {
      city?: string;
      country?: string;
    };
  };
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function UsersPage() {
  const supabase = useSupabaseClient();
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [timeFilter, setTimeFilter] = useState("30d");

  const handlePageChange = (newPage: number) => {
    setPagination({ ...pagination, page: newPage });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLimitChange = (newLimit: number) => {
    setPagination({ ...pagination, limit: newLimit, page: 1 });
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        filter: filter,
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(statusFilter !== "all" && { status: statusFilter }),
        ...(search && { search }),
      });



      
      if(filter === "womenEmployees"){
        const response = await callBackend<UsersResponse>(
        supabase,
        `/api/v1/admin/users?${params}`,
        { method: "GET" }
      );

         if (response.success && response.data) {
        setUsers(response.data.users);
        setPagination(response.data.pagination);
      }
      }
        else {
          const response = await callBackend<UsersResponse>(
        supabase,
        `/api/v1/admin/users?${params}`,
        { method: "GET" }
      );

         if (response.success && response.data) {
        setUsers(response.data.users);
        setPagination(response.data.pagination);
      }
        }

    } catch (err) {
      console.error("Failed to fetch users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, [filter, statusFilter, pagination.page, pagination.limit, search]);

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
      <span className={`pill ${colors[status] || colors.active}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-[#2A1F2D] mb-2">Users</h1>
        <p className="text-[#6F6077]">Manage and analyze your user base</p>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#6F6077] mb-2">Filter</label>
            <select
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E94057]"
            >
              <option value="all">All Users</option>
              <option value="new">New Users</option>
              <option value="active">Active Users</option>
              <option value="inactive">Inactive Users</option>
              <option value="premium">Premium Users</option>
              <option value="womenEmployees">Women Employees</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6F6077] mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E94057]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="banned">Banned</option>
              <option value="deleted">Deleted</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6F6077] mb-2">Time Range</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E94057]"
            >
              <option value="today">Today</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6F6077] mb-2">Search</label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              placeholder="Email, name, or ID..."
              className="w-full rounded-xl border border-white/60 bg-white/70 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E94057]"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-[#6F6077]">Loading users...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/50 border-b border-white/60">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6F6077] uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6F6077] uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-[#6F6077] uppercase tracking-wider">
                      Subscription
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
                  {users.map((user) => (
                    <tr key={user.user_id} className="hover:bg-white/30 transition-colors">
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
                              {user.displayName || "No name"}
                            </div>
                            <div className="text-sm text-[#6F6077]">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                      <td className="px-6 py-4">
                        {user.subscription?.status === "active" ? (
                          <span className="pill bg-[#E94057]/10 text-[#E94057]">
                            {user.subscription.plan || "Premium"}
                          </span>
                        ) : (
                          <span className="text-sm text-[#6F6077]">Free</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6F6077]">
                        {user.profile?.location?.city || "—"}
                        {user.profile?.location?.country && `, ${user.profile.location.country}`}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#6F6077]">
                        {formatDate(user.lastLoginAt)}
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/admin/users/${encodeURIComponent(user.email)}`}
                          className="text-sm text-[#E94057] hover:underline"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty State */}
            {!loading && users.length === 0 && (
              <div className="p-8 text-center text-[#6F6077]">
                <p className="text-lg mb-2">No users found</p>
                <p className="text-sm">Try adjusting your filters or search criteria</p>
              </div>
            )}

            {/* Pagination */}
            {!loading && pagination.total > 0 && (
              <div className="px-4 md:px-6 py-4 border-t border-white/60">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-[#6F6077]">
                      Showing <span className="font-semibold text-[#2A1F2D]">{((pagination.page - 1) * pagination.limit) + 1}</span> to{" "}
                      <span className="font-semibold text-[#2A1F2D]">{Math.min(pagination.page * pagination.limit, pagination.total)}</span> of{" "}
                      <span className="font-semibold text-[#2A1F2D]">{pagination.total}</span> users
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-[#6F6077] whitespace-nowrap">Per page:</label>
                      <select
                        value={pagination.limit}
                        onChange={(e) => handleLimitChange(Number(e.target.value))}
                        className="rounded-xl border border-white/60 bg-white/70 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#E94057]"
                      >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                        <option value="200">200</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={pagination.page === 1}
                      className="px-3 py-2 rounded-xl bg-white/50 text-sm font-medium text-[#6F6077] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/70 transition-all"
                      aria-label="First page"
                    >
                      ««
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-4 py-2 rounded-xl bg-white/50 text-sm font-medium text-[#6F6077] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/70 transition-all"
                    >
                      Previous
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        let pageNum: number;
                        if (pagination.pages <= 5) {
                          pageNum = i + 1;
                        } else if (pagination.page <= 3) {
                          pageNum = i + 1;
                        } else if (pagination.page >= pagination.pages - 2) {
                          pageNum = pagination.pages - 4 + i;
                        } else {
                          pageNum = pagination.page - 2 + i;
                        }
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                              pagination.page === pageNum
                                ? "bg-[#E94057] text-white"
                                : "bg-white/50 text-[#6F6077] hover:bg-white/70"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      className="px-4 py-2 rounded-xl bg-white/50 text-sm font-medium text-[#6F6077] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/70 transition-all"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => handlePageChange(pagination.pages)}
                      disabled={pagination.page >= pagination.pages}
                      className="px-3 py-2 rounded-xl bg-white/50 text-sm font-medium text-[#6F6077] disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/70 transition-all"
                      aria-label="Last page"
                    >
                      »»
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
