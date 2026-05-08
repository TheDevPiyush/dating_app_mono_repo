"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ShieldCheck, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useSession, useSupabaseClient } from "@supabase/auth-helpers-react";
import { callBackend } from "@/lib/api";

interface NavbarProps {
  onMenuClick: () => void;
}

interface NavLinkItem {
  href: string;
  label: string;
  icon?: LucideIcon;
  matchPrefix?: boolean; // match pathname.startsWith(href) instead of exact
}

const NAV_LINKS: NavLinkItem[] = [
  { href: "/terms-and-conditions", label: "Terms" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about-us", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar({ onMenuClick }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useSession();
  const supabase = useSupabaseClient();
  const [hidden, setHidden] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const lastYRef = useRef(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isHoveringRef = useRef(false);

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

  const startAutoHideTimer = () => {
    // Clear existing auto-hide timer
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
    }
    // Start new timer to hide after 5 seconds of no scroll
    autoHideTimeoutRef.current = setTimeout(() => {
      // Only hide if not hovering (don't check hidden state as it might be stale)
      if (!isHoveringRef.current) {
        setHidden(true);
      }
    }, 2000);
  };

  const clearAutoHideTimer = () => {
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
      autoHideTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    lastYRef.current = window.scrollY;

    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastYRef.current;

      // Avoid flicker on tiny scroll changes
      if (Math.abs(delta) < 8) return;

      // Clear any pending scroll timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }

      // Scroll down => hide (with delay, unless hovering)
      if (delta > 0) {
        clearAutoHideTimer(); // Cancel auto-hide since we're hiding immediately
        scrollTimeoutRef.current = setTimeout(() => {
          if (!isHoveringRef.current) {
            setHidden(true);
          }
        }, 150); // Minor delay for smooth transition
      } 
      // Scroll up => show (with delay) and start/reset auto-hide timer
      else if (delta < 0) {
        clearAutoHideTimer(); // Clear existing timer first
        scrollTimeoutRef.current = setTimeout(() => {
          setHidden(false);
          // Start auto-hide timer after showing (only if not hovering)
          if (!isHoveringRef.current) {
            startAutoHideTimer();
          }
        }, 150); // Minor delay for smooth transition
      }

      lastYRef.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      clearAutoHideTimer();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-4 transition-transform duration-500 ease-in-out md:px-6 pointer-events-none ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      <div className="max-w-7xl mx-auto">
        <div 
          className="pointer-events-auto bg-gray-200/10 rounded-2xl px-4 py-3 flex items-center justify-between backdrop-blur-md border border-white shadow-lg"
          onMouseEnter={() => {
            isHoveringRef.current = true;
            // Cancel any pending hide action
            if (scrollTimeoutRef.current) {
              clearTimeout(scrollTimeoutRef.current);
              scrollTimeoutRef.current = null;
            }
            // Cancel auto-hide timer while hovering
            clearAutoHideTimer();
          }}
          onMouseLeave={() => {
            isHoveringRef.current = false;
            // Restart auto-hide timer when leaving (if navbar is visible)
            if (!hidden) {
              startAutoHideTimer();
            }
          }}
        >
          {/* Logo and Menu Button */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="md:hidden text-[#2A1F2D] hover:text-[#E94057]"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-linear-to-br from-[#E94057] to-[#FF7EB3] rounded-lg flex items-center justify-center">
                <Image
                  src="/pookiey_logo.png"
                  alt="Pookiey Logo"
                  height={50}
                  width={50}
                />
              </div>
              <span className="text-xl font-bold text-[#E94057] hidden sm:inline-block">Pookiey</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((item) => {
              const isActive = item.matchPrefix
                ? pathname?.startsWith(item.href)
                : pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-sm transition-colors font-bold flex items-center gap-1.5 ${
                    isActive ? "text-[#E94057]" : "text-[#2A1F2f] hover:text-[#E94057]"
                  }`}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              );
            })}
            {isAdmin && (
              <Link
                href="/admin"
                className={`text-sm transition-colors font-bold flex items-center gap-1.5 ${
                  pathname?.startsWith("/admin")
                    ? "text-[#E94057]"
                    : "text-[#2A1F2D] hover:text-[#E94057]"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </Link>
            )}
            {session ? (
              <button
                onClick={handleLogout}
                className="text-sm font-medium px-4 py-2 bg-[#E94057] text-white rounded-lg hover:bg-[#C3344C] transition-colors"
              >
                Logout
              </button>
            ) : (
              <Link
                href="/auth"
                className="text-sm font-medium px-4 py-2 bg-[#E94057] text-white rounded-lg hover:bg-[#C3344C] transition-colors"
              >
                Login
              </Link>
            )}
          </div>

          {/* Mobile Login/Logout Button */}
          {session ? (
            <button
              onClick={handleLogout}
              className="md:hidden text-sm font-medium px-3 py-1.5 bg-[#E94057] text-white rounded-lg hover:bg-[#C3344C] transition-colors"
            >
              Logout
            </button>
          ) : (
            <Link
              href="/auth"
              className="md:hidden text-sm font-medium px-3 py-1.5 bg-[#E94057] text-white rounded-lg hover:bg-[#C3344C] transition-colors"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

