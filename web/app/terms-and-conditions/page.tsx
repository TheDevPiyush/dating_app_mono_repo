import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms and Conditions | Pookiey",
  description:
    "Read the terms and conditions for using the Pookiey dating app platform.",
};

const sections = [
  {
    title: "1. Eligibility",
    points: [
      "You must be at least 18 years old to create an account or use Pookiey.",
      "You agree to provide accurate profile information and keep it updated.",
      "You are responsible for activity on your account and for keeping login credentials secure.",
    ],
  },
  {
    title: "2. Community Standards",
    points: [
      "Respectful behavior is mandatory. Harassment, hate speech, abuse, impersonation, or threats are not allowed.",
      "You may not post illegal, explicit, misleading, or harmful content.",
      "We may moderate, remove content, suspend, or terminate accounts that violate these terms.",
    ],
  },
  {
    title: "3. Safety and Reporting",
    points: [
      "Please use in-app safety tools, including block and report features, when needed.",
      "If you believe a user presents a risk, report immediately through support channels.",
      "Pookiey may review reports and act to protect users and platform integrity.",
    ],
  },
  {
    title: "4. Subscription and Billing",
    points: [
      "Paid features, plans, and prices are shown before purchase.",
      "Billing is processed through secure third-party payment partners.",
      "Refunds, where applicable, are governed by our Refund Policy.",
    ],
  },
  {
    title: "5. Account Termination",
    points: [
      "You may stop using the service at any time and request account deletion.",
      "We may suspend or close accounts for fraud, abuse, policy violations, or legal reasons.",
      "Certain records may be retained for safety, compliance, and dispute resolution.",
    ],
  },
  {
    title: "6. Limitation of Liability",
    points: [
      "Pookiey provides a platform for introductions and communication between users.",
      "We do not guarantee compatibility, meeting outcomes, or uninterrupted service availability.",
      "To the extent permitted by law, Pookiey is not liable for indirect or consequential damages.",
    ],
  },
];

export default function TermsAndConditionsPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-[#fdf5f7] to-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#E94057]/10 blur-3xl md:h-[380px] md:w-[380px]" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#4B164C]/10 blur-3xl md:h-[320px] md:w-[320px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16 md:px-8">
        <header className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#E94057]">
            Legal
          </p>
          <h1 className="text-4xl font-bold text-[#2A1F2D] md:text-5xl">
            Terms and Conditions
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base text-[#6F6077]">
            These terms explain your rights and responsibilities while using
            Pookiey. By creating an account or using our services, you agree to
            follow these conditions.
          </p>
        </header>

        <div className="space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className="rounded-3xl border border-white/60 bg-white/80 p-7 shadow-lg shadow-[#4B164C]/5 backdrop-blur"
            >
              <h2 className="mb-4 text-2xl font-bold text-[#2A1F2D]">
                {section.title}
              </h2>
              <ul className="space-y-3 text-sm leading-relaxed text-[#2A1F2D] md:text-base">
                {section.points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#E94057]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
