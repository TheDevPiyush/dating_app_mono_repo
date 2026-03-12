"use client";

import { useEffect } from "react";
import { useSessionContext } from "@supabase/auth-helpers-react";
import { useRouter } from "next/navigation";

export default function AuthRedirect() {
  const { session, isLoading } = useSessionContext();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && session) {
      router.push("/dashboard");
    }
  }, [session, isLoading, router]);

  return null;
}

