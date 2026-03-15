"use client";

export default function ChildSafetyStandardPage() {
    const effectiveDate = "March 15, 2025";
    const lastUpdated = "March 15, 2026";

    return (
        <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-white via-[#fdf5f7] to-white">
            {/* Background decorations */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-[#E94057]/10 blur-3xl md:h-[380px] md:w-[380px]" />
                <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-[#4B164C]/10 blur-3xl md:h-[320px] md:w-[320px]" />
                <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-[#FF7EB3]/10 blur-3xl md:h-[420px] md:w-[420px]" />
            </div>

            <div className="relative z-10 mx-auto min-h-screen w-full max-w-6xl px-6 py-12 md:px-8 lg:px-12">

                {/* Header */}
                <div className="mb-12 text-center">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#E94057] to-[#FF7EB3] mb-6 shadow-lg shadow-[#E94057]/25">
                        <svg className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-bold leading-tight text-[#2A1F2D] md:text-6xl mb-4">
                        Child Safety Standards
                    </h1>
                    <p className="text-lg text-[#6F6077] max-w-2xl mx-auto">
                        Pookiey &mdash; by Pookiey PVT LTD
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-[#6F6077]">
                        <span>Effective: {effectiveDate}</span>
                        <span className="w-1 h-1 rounded-full bg-[#6F6077]" />
                        <span>Last Updated: {lastUpdated}</span>
                    </div>
                </div>

                {/* Commitment Banner */}
                <div className="mb-10 rounded-3xl border-2 border-[#E94057]/20 bg-gradient-to-br from-white/90 to-[#E94057]/5 p-8 shadow-xl shadow-[#E94057]/10 backdrop-blur md:p-10">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E94057] to-[#FF7EB3] flex items-center justify-center shadow-lg">
                            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[#2A1F2D] mb-2">Our Commitment</h2>
                            <p className="text-base leading-relaxed text-[#2A1F2D]">
                                Pookiey, developed and operated by <strong>Pookiey PVT LTD</strong>, is a dating application exclusively for adults aged 18 and above. We have a zero-tolerance policy toward child sexual abuse and exploitation (CSAE) and child sexual abuse material (CSAM) in any form. This document constitutes our published Child Safety Standards in accordance with Google Play&apos;s Child Safety Standards policy and all applicable laws and regulations.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Sections */}
                <div className="space-y-8 mb-12">

                    {/* 1. Strict Prohibition of CSAE */}
                    <div className="group rounded-3xl border border-white/60 bg-white/70 p-8 shadow-lg shadow-[#4B164C]/5 backdrop-blur transition-all hover:shadow-xl hover:shadow-[#4B164C]/10 md:p-10">
                        <div className="flex items-start gap-6">
                            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E94057]/10 to-[#FF7EB3]/10 flex items-center justify-center text-[#E94057] group-hover:scale-110 transition-transform">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-[#2A1F2D] mb-4 md:text-3xl">
                                    1. Strict Prohibition of CSAE &amp; CSAM
                                </h2>
                                <p className="text-base text-[#6F6077] mb-6 leading-relaxed">
                                    Pookiey explicitly and unconditionally prohibits child sexual abuse and exploitation (CSAE) and child sexual abuse material (CSAM) on its platform. The following are strictly forbidden:
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        "Any sexual content, imagery, or material involving minors",
                                        "Grooming, solicitation, or exploitation of individuals under 18",
                                        "Sharing, distributing, or requesting CSAM in any form",
                                        "Using the platform to facilitate abuse or exploitation of children",
                                        "Any communication that sexualizes minors or encourages harm",
                                        "Attempts to circumvent age-verification to access the platform as a minor",
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/60 border border-white/60">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E94057]/10 flex items-center justify-center mt-0.5">
                                                <div className="w-2 h-2 rounded-full bg-[#E94057]" />
                                            </div>
                                            <p className="text-sm text-[#2A1F2D] leading-relaxed">{item}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-6 p-4 rounded-2xl bg-[#E94057]/5 border border-[#E94057]/20">
                                    <p className="text-sm font-semibold text-[#E94057]">
                                        Violations result in immediate and permanent account termination, removal of all content, and mandatory reporting to law enforcement and the National Center for Missing &amp; Exploited Children (NCMEC) or the relevant Indian authority (CyberTipline / NCRB).
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 2. Age Verification & 18+ Only Platform */}
                    <div className="group rounded-3xl border border-white/60 bg-white/70 p-8 shadow-lg shadow-[#4B164C]/5 backdrop-blur transition-all hover:shadow-xl hover:shadow-[#4B164C]/10 md:p-10">
                        <div className="flex items-start gap-6">
                            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4B164C]/10 to-[#E94057]/10 flex items-center justify-center text-[#4B164C] group-hover:scale-110 transition-transform">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-[#2A1F2D] mb-4 md:text-3xl">
                                    2. Age Verification &amp; 18+ Only Platform
                                </h2>
                                <p className="text-base leading-relaxed text-[#2A1F2D] mb-4">
                                    Pookiey is designed exclusively for adults. We enforce the following age-gating measures to prevent access by minors:
                                </p>
                                <div className="space-y-3">
                                    {[
                                        "Date of birth is collected during onboarding and users must be 18 years or older to create an account.",
                                        "Accounts where the stated age is under 18 are automatically rejected and cannot be created.",
                                        "If we discover or receive a credible report that a user is under 18, the account is suspended immediately pending investigation.",
                                        "The app is listed as Mature (18+) on Google Play Store and Apple App Store.",
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/60 border border-white/60">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#4B164C]/10 flex items-center justify-center mt-0.5">
                                                <div className="w-2 h-2 rounded-full bg-[#4B164C]" />
                                            </div>
                                            <p className="text-sm text-[#2A1F2D] leading-relaxed">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. In-App Reporting Mechanism */}
                    <div className="group rounded-3xl border border-white/60 bg-white/70 p-8 shadow-lg shadow-[#4B164C]/5 backdrop-blur transition-all hover:shadow-xl hover:shadow-[#4B164C]/10 md:p-10">
                        <div className="flex items-start gap-6">
                            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF7EB3]/10 to-[#E94057]/10 flex items-center justify-center text-[#FF7EB3] group-hover:scale-110 transition-transform">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-[#2A1F2D] mb-4 md:text-3xl">
                                    3. In-App Reporting Mechanism
                                </h2>
                                <p className="text-base leading-relaxed text-[#2A1F2D] mb-4">
                                    Pookiey provides clear, accessible, in-app tools for users to report abuse, inappropriate content, or safety concerns:
                                </p>
                                <div className="space-y-3">
                                    {[
                                        "A \"Report\" button is available on every user profile and within every conversation thread.",
                                        "Reports can be submitted for categories including: underage user, sexual content, harassment, exploitation, and other safety concerns.",
                                        "All reports are reviewed by our Trust & Safety team within 24 hours.",
                                        "Reporters receive a follow-up notification on the outcome of their report.",
                                        "Anonymous reporting is supported to protect the identity of the person raising a concern.",
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/60 border border-white/60">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FF7EB3]/20 flex items-center justify-center mt-0.5">
                                                <div className="w-2 h-2 rounded-full bg-[#FF7EB3]" />
                                            </div>
                                            <p className="text-sm text-[#2A1F2D] leading-relaxed">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 4. Handling of CSAM */}
                    <div className="group rounded-3xl border-2 border-[#E94057]/20 bg-gradient-to-br from-white/90 to-[#E94057]/5 p-8 shadow-xl shadow-[#E94057]/15 backdrop-blur transition-all hover:shadow-2xl hover:shadow-[#E94057]/20 md:p-10">
                        <div className="flex items-start gap-6">
                            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E94057] to-[#FF7EB3] flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-[#2A1F2D] mb-4 md:text-3xl">
                                    4. Method for Addressing CSAM
                                </h2>
                                <p className="text-base leading-relaxed text-[#2A1F2D] mb-4">
                                    Pookiey has a defined and robust process for identifying, removing, and reporting child sexual abuse material (CSAM):
                                </p>
                                <div className="space-y-3 mb-6">
                                    {[
                                        "Any detected or reported CSAM is removed immediately upon identification — within minutes, not hours.",
                                        "The offending account is permanently banned with no possibility of reinstatement.",
                                        "All CSAM incidents are reported to the National Center for Missing & Exploited Children (NCMEC) CyberTipline and to India's National Cyber Crime Reporting Portal (cybercrime.gov.in).",
                                        "We preserve evidence and cooperate fully with law enforcement investigations.",
                                        "Our moderation team undergoes regular training on recognizing and handling CSAM incidents.",
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/60 border border-white/60">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E94057]/10 flex items-center justify-center mt-0.5">
                                                <div className="w-2 h-2 rounded-full bg-[#E94057]" />
                                            </div>
                                            <p className="text-sm text-[#2A1F2D] leading-relaxed">{item}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 rounded-2xl bg-[#E94057]/5 border border-[#E94057]/20">
                                    <p className="text-sm font-semibold text-[#E94057]">
                                        Pookiey will never knowingly host, transmit, or allow the distribution of CSAM. There are no exceptions.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 5. Trust & Safety Practices */}
                    <div className="group rounded-3xl border border-white/60 bg-white/70 p-8 shadow-lg shadow-[#4B164C]/5 backdrop-blur transition-all hover:shadow-xl hover:shadow-[#4B164C]/10 md:p-10">
                        <div className="flex items-start gap-6">
                            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#4B164C]/10 to-[#FF7EB3]/10 flex items-center justify-center text-[#4B164C] group-hover:scale-110 transition-transform">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-[#2A1F2D] mb-4 md:text-3xl">
                                    5. Trust &amp; Safety Practices
                                </h2>
                                <p className="text-base leading-relaxed text-[#2A1F2D] mb-4">
                                    Pookiey maintains ongoing safety practices to protect all users, with special attention to preventing harm to minors:
                                </p>
                                <div className="space-y-3">
                                    {[
                                        "Proactive content moderation by a dedicated Trust & Safety team.",
                                        "Automated detection systems that flag potentially harmful content for human review.",
                                        "Regular audits of platform safety measures and reporting flows.",
                                        "A clearly communicated Community Guidelines that all users must agree to before joining.",
                                        "Ability to block and report any user at any time from within the app.",
                                        "User verification features to reduce impersonation and fake profiles.",
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/60 border border-white/60">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#4B164C]/10 flex items-center justify-center mt-0.5">
                                                <div className="w-2 h-2 rounded-full bg-[#4B164C]" />
                                            </div>
                                            <p className="text-sm text-[#2A1F2D] leading-relaxed">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 6. Legal Compliance */}
                    <div className="group rounded-3xl border border-white/60 bg-white/70 p-8 shadow-lg shadow-[#4B164C]/5 backdrop-blur transition-all hover:shadow-xl hover:shadow-[#4B164C]/10 md:p-10">
                        <div className="flex items-start gap-6">
                            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E94057]/10 to-[#4B164C]/10 flex items-center justify-center text-[#E94057] group-hover:scale-110 transition-transform">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-[#2A1F2D] mb-4 md:text-3xl">
                                    6. Legal Compliance
                                </h2>
                                <p className="text-base leading-relaxed text-[#2A1F2D] mb-4">
                                    Pookiey PVT LTD is fully committed to complying with all applicable child safety laws and regulations, including but not limited to:
                                </p>
                                <div className="space-y-3">
                                    {[
                                        "Protection of Children from Sexual Offences (POCSO) Act, 2012 — India",
                                        "Information Technology (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021 — India",
                                        "The Juvenile Justice (Care and Protection of Children) Act, 2015 — India",
                                        "COPPA (Children's Online Privacy Protection Act) — where applicable",
                                        "GDPR child protection provisions — where applicable",
                                        "Any applicable regional child safety legislation in jurisdictions where Pookiey operates",
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/60 border border-white/60">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#E94057]/10 flex items-center justify-center mt-0.5">
                                                <div className="w-2 h-2 rounded-full bg-[#E94057]" />
                                            </div>
                                            <p className="text-sm text-[#2A1F2D] leading-relaxed">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 7. User Responsibilities */}
                    <div className="group rounded-3xl border border-white/60 bg-white/70 p-8 shadow-lg shadow-[#4B164C]/5 backdrop-blur transition-all hover:shadow-xl hover:shadow-[#4B164C]/10 md:p-10">
                        <div className="flex items-start gap-6">
                            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FF7EB3]/10 to-[#E94057]/10 flex items-center justify-center text-[#FF7EB3] group-hover:scale-110 transition-transform">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-[#2A1F2D] mb-4 md:text-3xl">
                                    7. User Responsibilities
                                </h2>
                                <p className="text-base leading-relaxed text-[#2A1F2D] mb-4">
                                    All Pookiey users are required to:
                                </p>
                                <div className="space-y-3">
                                    {[
                                        "Confirm they are 18 years of age or older during registration.",
                                        "Provide accurate date of birth information.",
                                        "Refrain from sharing, requesting, or engaging with any content that sexually exploits or abuses minors.",
                                        "Report any suspected minors or CSAE/CSAM encountered on the platform immediately.",
                                        "Not assist any third party in circumventing age-verification or safety controls.",
                                    ].map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-4 rounded-xl bg-white/60 border border-white/60">
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#FF7EB3]/20 flex items-center justify-center mt-0.5">
                                                <div className="w-2 h-2 rounded-full bg-[#FF7EB3]" />
                                            </div>
                                            <p className="text-sm text-[#2A1F2D] leading-relaxed">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 8. Updates to This Policy */}
                    <div className="group rounded-3xl border border-white/60 bg-white/70 p-8 shadow-lg shadow-[#4B164C]/5 backdrop-blur transition-all hover:shadow-xl hover:shadow-[#4B164C]/10 md:p-10">
                        <div className="flex items-start gap-6">
                            <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E94057]/10 to-[#4B164C]/10 flex items-center justify-center text-[#E94057] group-hover:scale-110 transition-transform">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-[#2A1F2D] mb-4 md:text-3xl">
                                    8. Updates to This Policy
                                </h2>
                                <p className="text-base leading-relaxed text-[#2A1F2D]">
                                    Pookiey PVT LTD may update these Child Safety Standards from time to time to reflect changes in law, platform features, or best practices. The &ldquo;Last Updated&rdquo; date at the top of this page will be revised accordingly. Continued use of the Pookiey app after any update constitutes acceptance of the revised standards. We encourage users to review this page periodically.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Child Safety Point of Contact */}
                <div className="rounded-3xl border-2 border-[#E94057]/30 bg-gradient-to-br from-white/90 to-[#E94057]/5 p-8 shadow-xl shadow-[#E94057]/10 backdrop-blur md:p-10 mb-8">
                    <div className="flex items-start gap-6">
                        <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#E94057] to-[#FF7EB3] flex items-center justify-center text-white shadow-lg">
                            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-[#2A1F2D] mb-2 md:text-3xl">
                                Child Safety Point of Contact
                            </h2>
                            <p className="text-base text-[#6F6077] mb-6 leading-relaxed">
                                Pookiey PVT LTD has designated a dedicated child safety point of contact for reporting concerns, CSAM, or any suspected CSAE on the platform. All reports are treated with the utmost urgency and confidentiality.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/80 border border-white/60 shadow-sm hover:shadow-md transition-all">
                                    <svg className="h-5 w-5 text-[#E94057] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <div>
                                        <p className="text-xs text-[#6F6077] font-medium uppercase tracking-wide">Child Safety Email</p>
                                        <a href="mailto:childsafety@pookiey.com" className="text-[#E94057] hover:text-[#C3344C] font-semibold transition-colors text-sm">
                                            childsafety@pookiey.com
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/80 border border-white/60 shadow-sm hover:shadow-md transition-all">
                                    <svg className="h-5 w-5 text-[#4B164C] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                    <div>
                                        <p className="text-xs text-[#6F6077] font-medium uppercase tracking-wide">General Support</p>
                                        <a href="mailto:support@pookiey.com" className="text-[#4B164C] hover:text-[#3a1039] font-semibold transition-colors text-sm">
                                            support@pookiey.com
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/80 border border-white/60 shadow-sm hover:shadow-md transition-all">
                                    <svg className="h-5 w-5 text-[#E94057] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-xs text-[#6F6077] font-medium uppercase tracking-wide">Company</p>
                                        <p className="text-[#2A1F2D] font-semibold text-sm">Pookiey PVT LTD, India</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white/80 border border-white/60 shadow-sm hover:shadow-md transition-all">
                                    <svg className="h-5 w-5 text-[#4B164C] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="text-xs text-[#6F6077] font-medium uppercase tracking-wide">Response Time</p>
                                        <p className="text-[#2A1F2D] font-semibold text-sm">Within 24 hours</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer acknowledgement */}
                <div className="rounded-3xl border border-white/60 bg-white/70 p-8 shadow-md backdrop-blur md:p-10 text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#E94057] to-[#FF7EB3] flex items-center justify-center shadow-lg">
                            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                    <p className="text-base text-[#6F6077] md:text-lg leading-relaxed max-w-3xl mx-auto">
                        By using Pookiey, you confirm that you are 18 years of age or older and agree to these Child Safety Standards. Pookiey PVT LTD is committed to maintaining a safe, respectful, and legal platform for all adult users and to the absolute protection of children from exploitation and abuse.
                    </p>
                    <p className="mt-4 text-sm text-[#6F6077]">
                        &copy; {new Date().getFullYear()} Pookiey PVT LTD. All rights reserved.
                    </p>
                </div>

            </div>
        </div>
    );
}
