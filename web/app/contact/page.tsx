import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | Pookiey",
  description:
    "Contact the Pookiey team at support@pookiey.com for all queries.",
};

const contactCards = [
  {
    title: "General Support",
    email: "support@pookiey.com",
    description: "Account help, reports, and app-related assistance.",
  },
  {
    title: "Billing Help",
    email: "support@pookiey.com",
    description: "Refunds, payment failures, and subscription questions.",
  },
  {
    title: "Privacy Requests",
    email: "support@pookiey.com",
    description: "Data access, deletion requests, and privacy concerns.",
  },
];

export default function ContactPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-[#fdf5f7] to-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#E94057]/10 blur-3xl md:h-[380px] md:w-[380px]" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#4B164C]/10 blur-3xl md:h-[320px] md:w-[320px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16 md:px-8">
        <header className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#E94057]">
            Contact
          </p>
          <h1 className="text-4xl font-bold text-[#2A1F2D] md:text-5xl">
            We Are Here To Help
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base text-[#6F6077]">
            Have a question about your matches, safety, subscription, or account?
            Reach out and our team will assist you quickly.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-3">
          {contactCards.map((card) => (
            <article
              key={card.title}
              className="rounded-3xl border border-white/60 bg-white/80 p-6 shadow-lg shadow-[#4B164C]/5 backdrop-blur"
            >
              <h2 className="mb-3 text-xl font-bold text-[#2A1F2D]">{card.title}</h2>
              <p className="mb-4 text-sm text-[#6F6077]">{card.description}</p>
              <a
                href={`mailto:${card.email}`}
                className="text-sm font-semibold text-[#E94057] hover:text-[#C3344C]"
              >
                {card.email}
              </a>
            </article>
          ))}
        </div>

        <section className="mt-6 rounded-3xl border border-white/60 bg-white/80 p-7 shadow-lg shadow-[#4B164C]/5 backdrop-blur md:p-9">
          <h2 className="mb-3 text-2xl font-bold text-[#2A1F2D]">Response Time</h2>
          <p className="text-sm leading-relaxed text-[#2A1F2D] md:text-base">
            We usually respond within 24-48 hours on business days. For urgent
            safety reports, mention "Urgent Safety" in your email subject.
          </p>
        </section>
      </div>
    </main>
  );
}
