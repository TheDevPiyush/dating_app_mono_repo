"use client";

const privacyPolicyData = {
  title: "Privacy Policy",
  intro: "At Pookiey, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our dating application.",
  section1Title: "1. Information We Collect",
  section1Content: "We collect information that you provide directly to us, including:",
  section1Point1: "Profile information (name, age, photos, bio, interests, location)",
  section1Point2: "Account credentials (email address, password)",
  section1Point3: "Communication data (messages, voice notes, photos shared within the app)",
  section1Point4: "Usage data (how you interact with the app, features you use)",
  section2Title: "2. How We Use Your Information",
  section2Content: "We use the information we collect to provide, maintain, and improve our services, including matching you with potential partners, facilitating communication, and personalizing your experience. We also use your information to send you notifications, respond to your inquiries, and ensure the safety and security of our platform.",
  section3Title: "3. Information Sharing and Disclosure",
  section3Content: "We do not sell your personal information. We may share your information in the following circumstances:",
  section3Point1: "With other users as part of the matching and communication features",
  section3Point2: "With service providers who assist us in operating our platform (subject to confidentiality agreements)",
  section3Point3: "When required by law or to protect our rights and the safety of our users",
  section4Title: "4. Location Information",
  section4Content: "We collect location information to help you find matches nearby. You can control location sharing through your device settings. We use location data only to provide location-based matching and do not share your precise location with other users.",
  section5Title: "5. Data Security",
  section5Content: "Your data security is our top priority. All user data is collected, processed, and stored securely on Indian servers, ensuring protection and compliance with applicable Indian data protection requirements. We use robust encryption for messages, audio interactions, and video interactions to preserve user security and privacy. We also apply secure data transmission standards and regular security audits to protect against unauthorized access, alteration, disclosure, or destruction. We do not sell your personal information and only use it as described in this policy to provide and improve our services.",
  section6Title: "6. Your Rights and Choices",
  section6Content: "You have the right to access, update, or delete your personal information at any time through your account settings. You can also opt out of certain communications and control your privacy settings within the app.",
  section7Title: "7. Children's Privacy",
  section7Content: "Our services are intended for users who are 18 years of age or older. We do not knowingly collect personal information from children under 18. If you believe we have collected information from a child under 18, please contact us immediately.",
  section8Title: "8. Changes to This Privacy Policy",
  section8Content: "We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the 'Last Updated' date. You are advised to review this Privacy Policy periodically for any changes.",
  contactTitle: "Contact Us",
  contactContent: "If you have any questions about this Privacy Policy or our privacy practices, please contact us at:",
  email: "Email",
  footer: "By using Pookiey, you acknowledge that you have read and understood this Privacy Policy.",
};

export default function PrivacyPolicyPage() {
  const sections = [
    {
      title: privacyPolicyData.section1Title,
      content: privacyPolicyData.section1Content,
      points: [
        privacyPolicyData.section1Point1,
        privacyPolicyData.section1Point2,
        privacyPolicyData.section1Point3,
        privacyPolicyData.section1Point4,
      ],
    },
    {
      title: privacyPolicyData.section2Title,
      content: privacyPolicyData.section2Content,
    },
    {
      title: privacyPolicyData.section3Title,
      content: privacyPolicyData.section3Content,
      points: [
        privacyPolicyData.section3Point1,
        privacyPolicyData.section3Point2,
        privacyPolicyData.section3Point3,
      ],
    },
    {
      title: privacyPolicyData.section4Title,
      content: privacyPolicyData.section4Content,
    },
    {
      title: privacyPolicyData.section5Title,
      content: privacyPolicyData.section5Content,
      highlight: true,
    },
    {
      title: privacyPolicyData.section6Title,
      content: privacyPolicyData.section6Content,
    },
    {
      title: privacyPolicyData.section7Title,
      content: privacyPolicyData.section7Content,
    },
    {
      title: privacyPolicyData.section8Title,
      content: privacyPolicyData.section8Content,
    },
  ];

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-[#fdf5f7] to-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#E94057]/10 blur-3xl md:h-[380px] md:w-[380px]" />
        <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#4B164C]/10 blur-3xl md:h-[320px] md:w-[320px]" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#FF7EB3]/10 blur-3xl md:h-[420px] md:w-[420px]" />
      </div>

      <div className="relative z-10 mx-auto min-h-screen w-full max-w-6xl px-4 py-12 sm:px-6 md:px-8 lg:px-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold leading-tight text-[#2A1F2D] sm:text-5xl md:text-6xl">
            {privacyPolicyData.title}
          </h1>
          <div className="mx-auto h-1 w-28 rounded-full bg-gradient-to-r from-[#E94057] via-[#FF7EB3] to-[#4B164C]" />
        </div>

        <div className="mb-12 rounded-3xl border border-white/60 bg-gradient-to-br from-white/90 to-white/70 p-8 shadow-xl shadow-[#E94057]/10 backdrop-blur md:p-10">
          <p className="text-lg leading-relaxed text-[#2A1F2D] md:text-xl">
            {privacyPolicyData.intro}
          </p>
        </div>

        <div className="mb-12 space-y-6">
          {sections.map((section) => (
            <section
              key={section.title}
              className={`rounded-3xl p-7 shadow-lg backdrop-blur md:p-9 ${
                section.highlight
                  ? "border-2 border-[#E94057]/20 bg-gradient-to-br from-white/90 to-[#E94057]/5 shadow-[#E94057]/15"
                  : "border border-white/60 bg-white/80 shadow-[#4B164C]/5"
              }`}
            >
              <h2 className="mb-4 text-2xl font-bold text-[#2A1F2D] md:text-3xl">
                {section.title}
              </h2>
              <p className="text-base leading-relaxed text-[#2A1F2D]">
                {section.content}
              </p>
              {section.points && (
                <ul className="mt-5 space-y-3">
                  {section.points.map((point) => (
                    <li key={point} className="flex gap-3">
                      <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-[#E94057]" />
                      <span className="text-sm leading-relaxed text-[#2A1F2D] md:text-base">
                        {point}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mb-8 rounded-3xl border border-white/60 bg-gradient-to-br from-white/90 to-white/70 p-8 shadow-xl shadow-[#E94057]/10 backdrop-blur md:p-10">
          <h2 className="mb-4 text-2xl font-bold text-[#2A1F2D] md:text-3xl">
            {privacyPolicyData.contactTitle}
          </h2>
          <p className="mb-5 text-base leading-relaxed text-[#6F6077]">
            {privacyPolicyData.contactContent}
          </p>
          <p className="text-base text-[#2A1F2D]">
            <span className="font-semibold">{privacyPolicyData.email}:</span>{" "}
            <a
              href="mailto:support@pookiey.com"
              className="font-semibold text-[#E94057] hover:text-[#C3344C]"
            >
              support@pookiey.com
            </a>
          </p>
        </div>

        <div className="rounded-3xl border border-white/60 bg-white/70 p-8 text-center shadow-md backdrop-blur md:p-10">
          <p className="text-base text-[#6F6077] md:text-lg leading-relaxed max-w-2xl mx-auto">
            {privacyPolicyData.footer}
          </p>
        </div>
      </div>
    </main>
  );
}
