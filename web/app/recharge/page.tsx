"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient, SupabaseClient, User } from "@supabase/supabase-js";
import { useRazorpay } from "../../hooks/useRazorpay";
import { callBackend } from "../../lib/api";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const STORAGE_KEY = "recharge-page-access-token";
const REFRESH_KEY = "recharge-page-refresh-token";
const PACKS_CACHE_KEY = "recharge-page-packs-cache";

const VERIFY_MAX_RETRIES = 5;
const VERIFY_RETRY_DELAY_MS = 1200;

type AuthState = "loading" | "authenticated" | "error";

interface MinutePack {
    _id: string;
    packId: string;
    title: string;
    minutes: number;
    amountInPaise: number;
    currency: string;
}

interface RazorpayOrderResponse {
    order: { id: string; amount: number; currency: string };
    pack: MinutePack;
    razorpayKey: string;
}

interface VerifyOrderResponse {
    payment: {
        status: string;
        packId: string;
        minutes: number;
        razorpayOrderId: string;
    };
    wallet: {
        balance: number;
        totalRecharged: number;
    } | null;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function RechargeLoader({ message }: { message: string }) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#FFF5F7] via-white to-[#F8ECF5] px-6">
            <div className="flex flex-col items-center gap-6">
                <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 animate-bounce rounded-full bg-[#E94057] [animation-delay:0ms]" />
                    <span className="inline-block h-3 w-3 animate-bounce rounded-full bg-[#FF7EB3] [animation-delay:150ms]" />
                    <span className="inline-block h-3 w-3 animate-bounce rounded-full bg-[#4B164C] [animation-delay:300ms]" />
                </div>
                <div className="text-center">
                    <p className="text-lg font-semibold text-[#2A1F2D]">{message}</p>
                    <p className="mt-1 text-sm text-[#6F6077]">
                        Setting things up for you...
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function RechargePage() {
    const [supabase] = useState<SupabaseClient>(() =>
        createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                storageKey: "sb-recharge-auth-token",
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
            },
        })
    );

    const { isReady: isRazorpayReady, error: razorpayError } = useRazorpay();

    const isFirstLoad = useRef(
        typeof window === "undefined" ? true : !sessionStorage.getItem(STORAGE_KEY)
    );

    const [authState, setAuthState] = useState<AuthState>(() => {
        if (typeof window === "undefined") return "loading";
        return sessionStorage.getItem(STORAGE_KEY) ? "authenticated" : "loading";
    });

    const [authError, setAuthError] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [packs, setPacks] = useState<MinutePack[]>(() => {
        if (typeof window === "undefined") return [];
        try {
            const cached = sessionStorage.getItem(PACKS_CACHE_KEY);
            return cached ? JSON.parse(cached) : [];
        } catch {
            return [];
        }
    });
    const packsLoadedOnce = useRef(
        typeof window !== "undefined" && !!sessionStorage.getItem(PACKS_CACHE_KEY)
    );
    const [packsLoading, setPacksLoading] = useState(
        () => typeof window === "undefined" || !sessionStorage.getItem(PACKS_CACHE_KEY)
    );
    const [packsError, setPacksError] = useState<string | null>(null);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingPackId, setProcessingPackId] = useState<string | null>(null);
    const [paymentSuccess, setPaymentSuccess] = useState(false);
    const [addedMinutes, setAddedMinutes] = useState(0);
    const [newBalance, setNewBalance] = useState(0);

    const didAuth = useRef(false);

    /* ---- Auth -------------------------------------------------------- */
    useEffect(() => {
        if (didAuth.current) return;
        didAuth.current = true;

        const params = new URLSearchParams(window.location.search);
        const accessToken = params.get("user-token-for-payment");
        const refreshToken = params.get("refresh-token");

        if (accessToken) {
            sessionStorage.setItem(STORAGE_KEY, accessToken);
            if (refreshToken) sessionStorage.setItem(REFRESH_KEY, refreshToken);
            window.history.replaceState({}, document.title, "/recharge");
        }

        const storedAccess = sessionStorage.getItem(STORAGE_KEY);
        const storedRefresh = sessionStorage.getItem(REFRESH_KEY);

        if (!storedAccess) {
            setAuthState("error");
            setAuthError("No payment token provided. Please open this page from the app.");
            return;
        }

        (async () => {
            try {
                const { data, error } = await supabase.auth.setSession({
                    access_token: storedAccess,
                    refresh_token: storedRefresh || storedAccess,
                });

                if (error || !data.user) {
                    sessionStorage.removeItem(STORAGE_KEY);
                    sessionStorage.removeItem(REFRESH_KEY);
                    setAuthState("error");
                    setAuthError("Authentication failed. Please try again from the app.");
                    return;
                }

                setUser(data.user);
                setAuthState((prev) => (prev === "authenticated" ? prev : "authenticated"));
            } catch {
                setAuthState("error");
                setAuthError("Something went wrong. Please try again from the app.");
            }
        })();
    }, [supabase]);

    /* ---- Fetch packs ------------------------------------------------- */
    useEffect(() => {
        if (authState !== "authenticated") return;
        if (packsLoadedOnce.current) return;

        let cancelled = false;

        (async () => {
            try {
                const res = await callBackend<MinutePack[]>(
                    supabase,
                    "/api/v1/wallet/packs"
                );

                if (cancelled) return;

                const fetchedPacks = res.data ?? [];
                setPacks(fetchedPacks);

                try {
                    sessionStorage.setItem(PACKS_CACHE_KEY, JSON.stringify(fetchedPacks));
                } catch {}

                packsLoadedOnce.current = true;
            } catch (err) {
                if (!cancelled) {
                    setPacksError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load packs. Please try again."
                    );
                }
            } finally {
                if (!cancelled) setPacksLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [authState, supabase]);

    /* ---- Verify with retry ------------------------------------------ */
    const verifyWithRetry = useCallback(
        async (razorpayResponse: Record<string, string>): Promise<VerifyOrderResponse> => {
            let lastError: Error | null = null;

            for (let attempt = 0; attempt < VERIFY_MAX_RETRIES; attempt++) {
                if (attempt > 0) await sleep(VERIFY_RETRY_DELAY_MS);

                try {
                    const res = await callBackend<VerifyOrderResponse>(
                        supabase,
                        "/api/v1/wallet/verify",
                        {
                            method: "POST",
                            jsonBody: {
                                razorpay_order_id: razorpayResponse.razorpay_order_id,
                                razorpay_payment_id: razorpayResponse.razorpay_payment_id,
                                razorpay_signature: razorpayResponse.razorpay_signature,
                            },
                        }
                    );

                    if (!res.data) throw new Error("Empty response from verify endpoint");

                    if (res.data.payment.status === "captured") {
                        return res.data;
                    }

                    lastError = new Error("Payment not yet confirmed, retrying...");
                } catch (err) {
                    lastError = err instanceof Error ? err : new Error("Verification failed");
                }
            }

            throw lastError ?? new Error("Payment verification timed out. Contact support.");
        },
        [supabase]
    );

    /* ---- Checkout ---------------------------------------------------- */
    const handleCheckout = useCallback(
        async (pack: MinutePack) => {
            setIsProcessing(true);
            setProcessingPackId(pack.packId);
            setCheckoutError(null);

            try {
                const orderResponse = await callBackend<RazorpayOrderResponse>(
                    supabase,
                    "/api/v1/wallet/create-order",
                    { method: "POST", jsonBody: { packId: pack.packId } }
                );

                if (!orderResponse.data) throw new Error("Failed to create order.");

                const { order, razorpayKey } = orderResponse.data;

                if (!window.Razorpay) throw new Error("Razorpay is not loaded.");

                const razorpay = new window.Razorpay({
                    key: razorpayKey,
                    amount: order.amount,
                    currency: order.currency,
                    name: "Pookiey Minutes",
                    description: `Buy ${pack.minutes} Minutes`,
                    order_id: order.id,
                    prefill: { email: user?.email ?? "" },

                    config: {
                        display: {
                            blocks: {
                                utib: { name: "Pay via UPI", instruments: [{ method: "upi" }] },
                                card: { name: "Pay via Card", instruments: [{ method: "card" }] },
                                wallet: { name: "Pay via Wallet", instruments: [{ method: "wallet" }] },
                            },
                            sequence: ["block.utib", "block.card", "block.wallet"],
                            preferences: { show_default_blocks: false },
                        },
                    },

                    handler: async (response: Record<string, string>) => {
                        try {
                            const verified = await verifyWithRetry(response);

                            sessionStorage.removeItem(STORAGE_KEY);
                            sessionStorage.removeItem(REFRESH_KEY);

                            setAddedMinutes(pack.minutes);
                            setNewBalance(verified.wallet?.balance ?? pack.minutes);
                            setPaymentSuccess(true);

                            // Notify the app WebView
                            try {
                                if (window.ReactNativeWebView) {
                                    window.ReactNativeWebView.postMessage(
                                        JSON.stringify({ type: "recharge_success", minutes: pack.minutes })
                                    );
                                }
                            } catch {}
                        } catch (err) {
                            setCheckoutError(
                                err instanceof Error
                                    ? err.message
                                    : "Failed to verify payment. Contact support."
                            );
                        }
                    },

                    notes: { packId: pack.packId, userId: user?.id ?? "", type: "recharge" },
                    theme: { color: "#E94057" },
                });

                razorpay.open();
            } catch (err) {
                setCheckoutError(
                    err instanceof Error
                        ? err.message
                        : "Checkout failed. Please try again."
                );
            } finally {
                setIsProcessing(false);
                setProcessingPackId(null);
            }
        },
        [supabase, user, verifyWithRetry]
    );

    /* ---- Currency formatter ----------------------------------------- */
    const amountToINR = (amountInPaise: number) =>
        new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
            amountInPaise / 100
        );

    /* ---- Render states ----------------------------------------------- */
    if (authState === "loading" && isFirstLoad.current && !packsLoadedOnce.current) {
        return <RechargeLoader message="Authenticating..." />;
    }

    if (authState === "error") {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#FFF5F7] via-white to-[#F8ECF5] px-6">
                <div className="w-full max-w-md rounded-3xl border border-red-100 bg-white p-8 text-center shadow-lg">
                    <p className="text-lg font-semibold text-[#C3344C]">
                        {authError ?? "Authentication failed"}
                    </p>
                    <p className="mt-2 text-sm text-[#6F6077]">
                        Please go back to the app and try again.
                    </p>
                </div>
            </div>
        );
    }

    if (paymentSuccess) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-[#FFF5F7] via-white to-[#F8ECF5] px-6">
                <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-lg">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                        <span className="text-3xl">+{addedMinutes}</span>
                    </div>
                    <h2 className="text-2xl font-semibold text-[#2A1F2D]">
                        Minutes Added!
                    </h2>
                    <p className="mt-1 text-sm font-medium text-[#E94057] uppercase tracking-wide">
                        {addedMinutes} minutes added to your wallet
                    </p>
                    <p className="mt-3 text-lg font-semibold text-[#2A1F2D]">
                        Balance: {newBalance} Mins
                    </p>
                    <p className="mt-2 text-sm text-[#6F6077]">
                        You can close this page and head back to the app.
                    </p>
                </div>
            </div>
        );
    }

    if (packsLoading && packs.length === 0 && !packsLoadedOnce.current) {
        return <RechargeLoader message="Loading minute packs..." />;
    }

    const errorMessage = checkoutError || razorpayError || packsError;

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#FFF5F7] via-white to-[#F8ECF5] px-4 py-8 sm:px-6">
            <div className="mx-auto w-full max-w-3xl">
                <div className="mb-8 text-center">
                    <span className="mb-3 inline-flex rounded-full bg-[#E94057]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#E94057]">
                        Recharge Minutes
                    </span>
                    <h1 className="text-2xl font-semibold leading-tight text-[#2A1F2D] sm:text-3xl">
                        Buy talk time minutes
                    </h1>
                    <p className="mt-2 text-sm text-[#6F6077]">
                        1 Min = 1 Token &middot; Secure payments via Razorpay
                    </p>
                </div>

                {errorMessage && (
                    <div className="mb-6 rounded-2xl border border-red-100 bg-red-50/80 p-4 text-center text-sm font-medium text-[#C3344C] shadow-sm">
                        {errorMessage}
                    </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                    {packs.map((pack) => (
                        <article
                            key={pack.packId}
                            className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-[#E94057]/10 transition duration-300 hover:-translate-y-1 hover:shadow-2xl"
                        >
                            <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                                <div className="absolute inset-0 bg-gradient-to-br from-[#E94057]/12 via-transparent to-[#4B164C]/12" />
                            </div>

                            <div className="relative space-y-3 text-center">
                                <p className="text-4xl font-bold text-[#E94057]">
                                    {pack.minutes}
                                </p>
                                <p className="text-sm font-semibold uppercase tracking-[0.15em] text-[#B49CC4]">
                                    Minutes
                                </p>
                                <p className="text-2xl font-semibold text-[#2A1F2D]">
                                    {amountToINR(pack.amountInPaise)}
                                </p>
                                <p className="text-xs text-[#6F6077]">
                                    {amountToINR(Math.round(pack.amountInPaise / pack.minutes))}/min
                                </p>
                            </div>

                            <button
                                onClick={() => handleCheckout(pack)}
                                disabled={
                                    !isRazorpayReady ||
                                    isProcessing ||
                                    Boolean(processingPackId && processingPackId !== pack.packId)
                                }
                                className="relative mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#2A1F2D] px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-[#2A1F2D]/20 transition hover:scale-[1.01] hover:bg-[#201523] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E94057] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isProcessing && processingPackId === pack.packId
                                    ? "Processing..."
                                    : "Buy Now"
                                }
                            </button>
                        </article>
                    ))}
                </div>

                <p className="mt-8 text-center text-xs text-[#B49CC4]">
                    Secure payments powered by Razorpay &middot; Minutes never expire
                </p>
            </div>
        </div>
    );
}

declare global {
    interface Window {
        ReactNativeWebView?: {
            postMessage: (message: string) => void;
        };
    }
}
