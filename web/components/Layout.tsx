"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./footer";

/**
 * Routes that render without any app chrome (Navbar, Sidebar, Footer).
 * Typically pages opened inside a mobile-app WebView.
 */
const BARE_ROUTES = ["/pay"];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isBareRoute = BARE_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem("sidebarOpen");
      if (savedState !== null) {
        const isMobile = window.innerWidth < 768;
        setSidebarOpen(isMobile ? savedState === "true" : false);
      } else {
        setSidebarOpen(false);
      }
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem("sidebarOpen", sidebarOpen.toString());
    }
  }, [sidebarOpen, mounted]);

  // Bare routes (e.g. /pay in mobile webview) — no Navbar, Sidebar, or Footer
  if (isBareRoute) {
    return <>{children}</>;
  }

  if (!mounted) {
    return <div>{children}</div>;
  }

  return (
    <div className="min-h-screen">
      <Navbar onMenuClick={() => setSidebarOpen((o) => !o)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="transition-all duration-300">{children}</main>
      <Footer />
    </div>
  );
}

