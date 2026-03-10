"use client";

import { useState, useEffect } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./footer";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load sidebar state from localStorage (only for mobile)
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem("sidebarOpen");
      if (savedState !== null) {
        // Only use saved state on mobile (small screens)
        const isMobile = window.innerWidth < 768;
        setSidebarOpen(isMobile ? savedState === "true" : false);
      } else {
        // Default to closed (sidebar hidden on desktop)
        setSidebarOpen(false);
      }
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      // Save sidebar state to localStorage
      localStorage.setItem("sidebarOpen", sidebarOpen.toString());
    }
  }, [sidebarOpen, mounted]);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  if (!mounted) {
    return <div>{children}</div>;
  }

  return (
    <div className="min-h-screen">
      <Navbar onMenuClick={toggleSidebar} />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <main className="transition-all duration-300">
        {children}
      </main>
    </div>
  );
}

