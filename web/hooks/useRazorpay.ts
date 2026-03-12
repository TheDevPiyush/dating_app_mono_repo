"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      close: () => void;
    };
  }
}

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const RAZORPAY_SCRIPT_ID = "razorpay-checkout-script";

export function useRazorpay() {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.Razorpay) {
      setIsReady(true);
      return;
    }

    const existing = document.getElementById(RAZORPAY_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.onload = () => setIsReady(true);
      existing.onerror = () => setError("Failed to load Razorpay checkout.");
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.id = RAZORPAY_SCRIPT_ID;
    script.async = true;

    script.onload = () => setIsReady(true);
    script.onerror = () => setError("Failed to load Razorpay checkout. Please try again later.");

    document.body.appendChild(script);

  }, []);

  return { isReady, error };
}