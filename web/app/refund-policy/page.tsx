import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy | Pookiey",
  description:
    "Understand Pookiey's strict no-refund policy for all successful payments.",
};

const refundRules = [
  "All successful payments made on Pookiey are final and non-refundable.",
  "Users are not eligible to raise any refund request once a payment is completed.",
  "No partial or pro-rata refunds are provided for unused subscription time or unused features.",
  "Plans canceled by users remain non-refundable after payment confirmation.",
  "By completing payment, you acknowledge and accept this no-refund policy.",
];

export default function RefundPolicyPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-[#fdf5f7] to-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-24 h-64 w-64 rounded-full bg-[#FF7EB3]/10 blur-3xl md:h-80 md:w-80" />
        <div className="absolute bottom-0 right-0 h-64 w-64 rounded-full bg-[#4B164C]/10 blur-3xl md:h-80 md:w-80" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-6 py-16 md:px-8">
        <header className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#E94057]">
            Billing
          </p>
          <h1 className="text-4xl font-bold text-[#2A1F2D] md:text-5xl">
            Refund Policy
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base text-[#6F6077]">
            Pookiey follows a strict no-refund policy. Once a payment is
            completed successfully, it cannot be reversed or refunded.
          </p>
        </header>

        <section className="rounded-3xl border border-white/60 bg-white/80 p-7 shadow-lg shadow-[#4B164C]/5 backdrop-blur md:p-9">
          <h2 className="mb-4 text-2xl font-bold text-[#2A1F2D]">Policy Rules</h2>
          <ul className="space-y-3 text-sm leading-relaxed text-[#2A1F2D] md:text-base">
            {refundRules.map((rule) => (
              <li key={rule} className="flex gap-3">
                <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#E94057]" />
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-3xl border border-white/60 bg-white/80 p-7 shadow-lg shadow-[#4B164C]/5 backdrop-blur md:p-9">
          <h2 className="mb-3 text-2xl font-bold text-[#2A1F2D]">
            Billing Support
          </h2>
          <p className="text-sm leading-relaxed text-[#2A1F2D] md:text-base">
            For payment receipts or billing-related clarifications, contact{" "}
            <a
              href="mailto:support@pookiey.com"
              className="font-semibold text-[#E94057] hover:text-[#C3344C]"
            >
              support@pookiey.com
            </a>
            . Please note this channel does not process refund requests.
          </p>
        </section>
      </div>
    </main>
  );
}
