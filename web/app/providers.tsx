"use client";

import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { createBrowserSupabaseClient } from "@supabase/auth-helpers-nextjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Routes that manage their own auth (e.g. mobile-app WebView pages).
 * The global SessionContextProvider is skipped so its auto-token-refresh
 * loop doesn't fire background network requests or trigger re-renders.
 */
const SELF_AUTH_ROUTES = ["/pay"];

function isSelfAuthRoute(pathname: string) {
  return SELF_AUTH_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Create the global Supabase browser client ONLY when we actually need it.
  // On self-auth routes the client is never instantiated, so no auto-refresh
  // timers or onAuthStateChange listeners run in the background.
  const [supabaseClient] = useState(() => {
    if (
      typeof window !== "undefined" &&
      isSelfAuthRoute(window.location.pathname)
    ) {
      return null;
    }
    return createBrowserSupabaseClient({
      supabaseUrl: supabaseUrl ?? "",
      supabaseKey: supabaseAnonKey ?? "",
    });
  });

  // Self-auth routes render children without the global auth context
  if (isSelfAuthRoute(pathname) || !supabaseClient) {
    return <>{children}</>;
  }

  return (
    <SessionContextProvider supabaseClient={supabaseClient}>
      {children}
    </SessionContextProvider>
  );
}