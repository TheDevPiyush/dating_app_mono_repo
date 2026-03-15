"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { callBackend } from "../../lib/api";

const adminNavItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/women-employees", label: "Women Employees", icon: "👩‍💼" },
  { href: "/admin/interactions", label: "Interactions", icon: "💬" },
  { href: "/admin/locations", label: "Locations", icon: "📍" },
  { href: "/admin/payments", label: "Payments", icon: "💰" },
  { href: "/admin/reports", label: "Reports", icon: "🚨" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const supabase = useSupabaseClient();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const verifyAdmin = async () => {
      // Verify admin status by calling an admin endpoint
      // Backend will handle authentication and authorization
      try {
        setIsChecking(true);
        const response = await callBackend(
          supabase,
          "/api/v1/admin/dashboard",
          { method: "GET" }
        );
        
        if (response.success) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
          router.push("/");
        }
      } catch (error) {
        setIsAdmin(false);
        router.push("/");
      } finally {
        setIsChecking(false);
      }
    };

    void verifyAdmin();
  }, [supabase, router]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Show loading state while checking
  if (isChecking || isAdmin === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[#6F6077]">
          {isChecking ? "Verifying admin access..." : "Access denied. Redirecting..."}
        </div>
      </div>
    );
  }

  // Only render admin UI if user is verified as admin
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-[#fdf5f7] to-white">
      {/* Background decorations */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#E94057]/10 blur-3xl md:h-[380px] md:w-[380px]" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#4B164C]/10 blur-3xl md:h-[320px] md:w-[320px]" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        {/* Mobile backdrop overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`glass-card fixed left-0 top-0 h-screen w-64 border-r border-white/60 p-6 z-50 transition-transform duration-300 ease-in-out ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <div className="mb-8 flex items-center justify-between">
            <Link href="/admin" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
              <span className="text-xl md:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#E94057] to-[#FF7EB3]">
                Pookiey Admin
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-2 rounded-lg hover:bg-white/50 transition-colors"
              aria-label="Close sidebar"
            >
              <svg
                className="w-6 h-6 text-[#6F6077]"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-xs text-[#6F6077] mb-6">Admin Panel</p>

          <nav className="space-y-2">
            {adminNavItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-[#E94057]/10 text-[#E94057] shadow-sm"
                      : "text-[#6F6077] hover:bg-white/50 hover:text-[#2A1F2D]"
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-6 left-6 right-6">
            <Link
              href="/"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-[#6F6077] hover:bg-white/50 transition-all"
            >
              <span>←</span>
              <span>Back to App</span>
            </Link>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 md:p-8 md:ml-64">
          {/* Mobile header with menu button */}
          <div className="md:hidden mb-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
              aria-label="Open sidebar"
            >
              <svg
                className="w-6 h-6 text-[#6F6077]"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/admin" className="flex items-center gap-2">
              <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#E94057] to-[#FF7EB3]">
                Pookiey Admin
              </span>
            </Link>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
