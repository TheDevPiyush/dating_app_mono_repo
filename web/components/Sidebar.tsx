"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Info, Users, HelpCircle, LogIn, LogOut, ShieldCheck, IndianRupee, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { callBackend } from "@/lib/api";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const supabase = useSupabaseClient();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!session) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    callBackend<{ isAdmin?: boolean }>(supabase, "/api/v1/user/me", { method: "GET" })
      .then((res) => {
        if (!cancelled) setIsAdmin(!!res.data?.isAdmin);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => { cancelled = true; };
  }, [session, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
    router.push("/");
  };

  const navigation = [
    { name: "Privacy Policy", href: "/privacy-policy", icon: Info },
    { name: "Pricing", href: "/pricing", icon: IndianRupee },
    { name: "About Us", href: "/about-us", icon: Users },
    { name: "Contact", href: "/contact", icon: Mail },
    { name: "Support", href: "/support", icon: HelpCircle },
  ];
  const adminNavItem = { name: "Admin", href: "/admin", icon: ShieldCheck };

  if (!mounted) return null;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Only visible on mobile (small screens) */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 transform transition-transform duration-300 ease-in-out md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full bg-black/20 backdrop-blur-md border-r border-white shadow-2xl">
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex h-16 items-center justify-between border-b border-white px-6">
              <Link href="/" className="flex items-center gap-2" onClick={onClose}>
                <div className="w-8 h-8 bg-linear-to-br from-[#E94057] to-[#FF7EB3] rounded-lg flex items-center justify-center">
                  <Image
                    src="/pookiey_logo.png"
                    alt="Pookiey Logo"
                    height={50}
                    width={50}
                  />
                </div>
                <span className="text-xl font-bold text-[#E94057]">Pookiey</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={onClose}
              >
                <X className="h-5 w-5 text-white" />
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors",
                      isActive
                        ? "bg-[#E94057]/10 text-[#E94057]"
                        : "text-white hover:bg-white/10"
                    )}
                  >
                    <item.icon className={cn("h-5 w-5", isActive ? "text-[#E94057]" : "text-white")} />
                    {item.name}
                  </Link>
                );
              })}
              {isAdmin && (
                <Link
                  href={adminNavItem.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors",
                    pathname?.startsWith("/admin")
                      ? "bg-[#E94057]/10 text-[#E94057]"
                      : "text-white hover:bg-white/10"
                  )}
                >
                  <adminNavItem.icon className={cn("h-5 w-5", pathname?.startsWith("/admin") ? "text-[#E94057]" : "text-white")} />
                  {adminNavItem.name}
                </Link>
              )}
              {/* Login/Logout */}
              {session ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors text-white hover:bg-white/10 w-full"
                >
                  <LogOut className="h-5 w-5 text-white" />
                  Logout
                </button>
              ) : (
                <Link
                  href="/auth"
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold transition-colors",
                    pathname === "/auth"
                      ? "bg-[#E94057]/10 text-[#E94057]"
                      : "text-white hover:bg-white/10"
                  )}
                >
                  <LogIn className={cn("h-5 w-5", pathname === "/auth" ? "text-[#E94057]" : "text-white")} />
                  Login
                </Link>
              )}
            </nav>

            {/* Footer */}
            <div className="border-t border-white p-4">
              <p className="text-xs text-white/70 text-center font-medium">
                © {new Date().getFullYear()} Pookiey
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

