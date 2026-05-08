

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us | Pookiey - India's Trusted Dating App",
  description:
    "Learn about Pookiey's mission to create meaningful connections in India. Discover our values, commitment to safety, and vision for authentic relationships.",
  keywords: [
    "about Pookiey",
    "dating app India",
    "online dating platform",
    "dating app mission",
    "safe dating app",
  ],
  openGraph: {
    title: "About Us | Pookiey - India's Trusted Dating App",
    description:
      "Learn about Pookiey's mission to create meaningful connections in India.",
    type: "website",
    url: "https://pookiey.com/about-us",
  },
};

const values = [
  {
    title: "Safety First",
    description:
      "We prioritize the security and privacy of our users, especially women. Our platform implements strict safety measures to ensure a secure dating environment.",
    color: "from-[#E94057] to-[#FF7EB3]",
  },
  {
    title: "Authenticity",
    description:
      "We believe in genuine connections. Every profile is verified to ensure you're connecting with real people looking for meaningful relationships.",
    color: "from-[#FF7EB3] to-[#E94057]",
  },
  {
    title: "Respect & Inclusivity",
    description:
      "Pookiey welcomes everyone. We foster a respectful community where people from all backgrounds can find love without judgment.",
    color: "from-[#4b164c] to-[#E94057]",
  },
  {
    title: "Meaningful Connections",
    description:
      "Beyond swipes and matches, we focus on helping you build deep, lasting relationships through thoughtful conversations.",
    color: "from-[#E94057] to-[#4b164c]",
  },
];

const features = [
  {
    title: "Verified Profiles",
    description:
      "Every user goes through our comprehensive verification process to ensure authenticity and build trust within our community.",
    highlight: "100% Verified",
  },
  {
    title: "Smart Matching",
    description:
      "Our advanced algorithm learns your preferences, values, and relationship goals to suggest compatible matches.",
    highlight: "AI-Powered",
  },
  {
    title: "Privacy Protection",
    description:
      "We don't allow screenshots or downloads, ensuring your photos and conversations remain private and secure.",
    highlight: "Secure",
  },
  {
    title: "Compatibility Quiz",
    description:
      "Take our fun, insightful compatibility quiz to better understand yourself and find matches who align with your values.",
    highlight: "Personalized",
  },
];

const stats = [
  { number: "100%", label: "Verified Users" },
  { number: "24/7", label: "Safety Support" },
  { number: "50K+", label: "Active Members" },
  { number: "95%", label: "Satisfaction Rate" },
];

const trustPillars = [
  {
    title: "Verified Community",
    description:
      "Profile verification helps reduce fake accounts and keeps conversations authentic from the first hello.",
  },
  {
    title: "Safety by Design",
    description:
      "From reporting tools to proactive moderation, every layer is built to protect users across interactions.",
  },
  {
    title: "Privacy Respect",
    description:
      "We focus on secure communication and responsible data handling so members can connect with confidence.",
  },
];

const roadmap = [
  {
    title: "Today",
    description:
      "Deliver a safe and meaningful dating experience with strong moderation and user-first product decisions.",
  },
  {
    title: "Next",
    description:
      "Expand compatibility signals and quality matching to make every introduction more relevant and intentional.",
  },
  {
    title: "Future",
    description:
      "Build India's most trusted relationship platform that supports lasting connections beyond the first match.",
  },
];

// SVG Components
const HeartSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill="currentColor"
    />
  </svg>
);

const ShieldSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"
      fill="currentColor"
    />
  </svg>
);

const SparkleSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"
      fill="currentColor"
    />
  </svg>
);

const UsersSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"
      fill="currentColor"
    />
  </svg>
);

const TargetSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"
      fill="currentColor"
    />
  </svg>
);

const LockSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"
      fill="currentColor"
    />
  </svg>
);

const CheckSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
      fill="currentColor"
    />
  </svg>
);

const QuoteSVG = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z"
      fill="currentColor"
    />
  </svg>
);

const WavePattern = ({ className = "" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 1200 120" preserveAspectRatio="none">
    <path
      d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z"
      fill="currentColor"
      opacity="0.25"
    />
    <path
      d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z"
      fill="currentColor"
      opacity="0.5"
    />
    <path
      d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z"
      fill="currentColor"
    />
  </svg>
);

export default function AboutUsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-pink-50/30 to-purple-50/20">
      {/* Decorative Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating circles */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-br from-[#E94057]/5 to-[#FF7EB3]/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-br from-[#4b164c]/5 to-[#E94057]/5 rounded-full blur-3xl animate-float animation-delay-1000" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-gradient-to-br from-[#FF7EB3]/5 to-transparent rounded-full blur-3xl animate-float animation-delay-1500" />
        
        {/* Geometric patterns */}
        <div className="absolute top-40 right-20 w-40 h-40 opacity-10">
          <HeartSVG className="w-full h-full text-[#E94057]" />
        </div>
        <div className="absolute bottom-40 left-20 w-32 h-32 opacity-10">
          <ShieldSVG className="w-full h-full text-[#4b164c]" />
        </div>
        
        {/* Wave patterns */}
        <div className="absolute top-0 left-0 right-0 transform rotate-180">
          <WavePattern className="w-full h-24 text-[#E94057]/10" />
        </div>
        <div className="absolute bottom-0 left-0 right-0">
          <WavePattern className="w-full h-24 text-[#4b164c]/10" />
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative pt-20 pb-28 md:pt-28 md:pb-36 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-6xl mx-auto">
            <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-[#E94057]/20 shadow-sm">
              <span className="w-2 h-2 bg-gradient-to-r from-[#E94057] to-[#FF7EB3] rounded-full animate-pulse" />
              <span className="text-xs md:text-sm font-semibold tracking-wider uppercase bg-gradient-to-r from-[#E94057] to-[#FF7EB3] bg-clip-text text-transparent">
                Our Journey
              </span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold mb-6 leading-tight tracking-tight">
              <span className="block text-[#2A1F2D] mb-2">About</span>
              <span className="block bg-gradient-to-r from-[#E94057] via-[#FF7EB3] to-[#4b164c] bg-clip-text text-transparent">
                Pookiey
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#2A1F2D]/70 font-medium max-w-4xl mx-auto leading-relaxed mb-8">
              Building India's most trusted platform for meaningful connections
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 max-w-2xl mx-auto mt-12">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 sm:p-6 text-center group hover:scale-105 transition-all duration-300 border border-white/50 shadow-lg"
                >
                  <div className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-br from-[#E94057] to-[#FF7EB3] bg-clip-text text-transparent mb-1">
                    {stat.number}
                  </div>
                  <div className="text-xs sm:text-sm text-[#2A1F2D]/60 font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-block mb-3">
              <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#E94057] opacity-70">
                Our Foundation
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#2A1F2D] via-[#E94057] to-[#4b164c] bg-clip-text text-transparent">
                Our Story
              </span>
            </h2>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#E94057] to-transparent mx-auto" />
          </div>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 md:p-8 lg:p-10 relative overflow-hidden border border-white/50 shadow-xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#E94057]/10 to-transparent rounded-bl-full" />
                <div className="relative z-10">
                  <p className="text-lg md:text-xl text-[#2A1F2D] leading-relaxed font-medium mb-4">
                    Pookiey was born from a simple yet powerful belief:{" "}
                    <span className="text-[#E94057] font-bold">everyone deserves to find meaningful connections</span>{" "}
                    in a safe, respectful environment.
                  </p>
                  <p className="text-base md:text-lg text-[#2A1F2D]/75 leading-relaxed">
                    In a world where online dating can feel overwhelming and impersonal, we set out to create something genuinely different.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Visual */}
            <div className="relative">
              <div className="bg-gradient-to-br from-[#FF7EB3]/10 via-transparent to-[#4b164c]/10 rounded-3xl p-8 md:p-10 relative overflow-hidden border border-white/50 shadow-xl">
                <div className="absolute -top-6 -left-6 w-24 h-24">
                  <HeartSVG className="w-full h-full text-[#E94057]/20" />
                </div>
                <div className="relative z-10">
                  <div className="w-16 h-16 mb-4">
                    <TargetSVG className="w-full h-full text-[#E94057]" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold text-[#E94057] mb-3">
                    Founded with Purpose
                  </h3>
                  <p className="text-sm md:text-base text-[#2A1F2D]/75 leading-relaxed">
                    Founded with a mission to revolutionize dating in India, Pookiey combines cutting-edge technology with a deep understanding of Indian culture and values.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Two Column Cards */}
          <div className="grid md:grid-cols-2 gap-6 mt-12">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 md:p-8 relative overflow-hidden group border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-[#E94057]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E94057] to-[#FF7EB3] flex items-center justify-center mb-4 shadow-lg">
                  <ShieldSVG className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-[#E94057] mb-3">
                  Safety at Our Core
                </h3>
                <p className="text-sm md:text-base text-[#2A1F2D]/75 leading-relaxed">
                  What sets us apart is our unwavering commitment to safety, especially for women. We've implemented robust safety features that go beyond industry standards.
                </p>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 md:p-8 relative overflow-hidden group border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF7EB3]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative z-10">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FF7EB3] to-[#E94057] flex items-center justify-center mb-4 shadow-lg">
                  <UsersSVG className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-[#FF7EB3] mb-3">
                  Growing Community
                </h3>
                <p className="text-sm md:text-base text-[#2A1F2D]/75 leading-relaxed">
                  Today, Pookiey connects thousands of people across major Indian cities, helping them find love, friendship, and meaningful relationships.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values Section */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-white to-pink-50/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-block mb-3">
              <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#E94057] opacity-70">
                What We Stand For
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#2A1F2D] via-[#E94057] to-[#4b164c] bg-clip-text text-transparent">
                Our Values
              </span>
            </h2>
            <p className="text-base md:text-lg text-[#2A1F2D]/60 max-w-xl mx-auto font-medium">
              The principles that guide everything we do
            </p>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#E94057] to-transparent mx-auto mt-4" />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-white/90 backdrop-blur-sm rounded-2xl p-6 text-center transition-all duration-300 hover:scale-105 hover:shadow-xl group border border-white/50"
              >
                <div className={`w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br ${value.color} flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                  {index === 0 && <ShieldSVG className="w-10 h-10 text-white" />}
                  {index === 1 && <SparkleSVG className="w-10 h-10 text-white" />}
                  {index === 2 && <UsersSVG className="w-10 h-10 text-white" />}
                  {index === 3 && <HeartSVG className="w-10 h-10 text-white" />}
                </div>
                <h3 className="text-lg font-bold text-[#2A1F2D] mb-2 group-hover:text-[#E94057] transition-colors duration-300">
                  {value.title}
                </h3>
                <p className="text-sm text-[#2A1F2D]/70 leading-relaxed">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-block mb-3">
              <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#E94057] opacity-70">
                Unique Features
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#2A1F2D] via-[#E94057] to-[#4b164c] bg-clip-text text-transparent">
                What Makes Us Different
              </span>
            </h2>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#E94057] to-transparent mx-auto" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 md:p-8 transition-all duration-300 hover:shadow-xl group border border-white/50"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E94057]/10 to-[#FF7EB3]/10 flex items-center justify-center mr-4">
                    {index === 0 && <CheckSVG className="w-6 h-6 text-[#E94057]" />}
                    {index === 1 && <TargetSVG className="w-6 h-6 text-[#E94057]" />}
                    {index === 2 && <LockSVG className="w-6 h-6 text-[#E94057]" />}
                    {index === 3 && <SparkleSVG className="w-6 h-6 text-[#E94057]" />}
                  </div>
                  <span className="text-xs font-bold text-white bg-gradient-to-r from-[#E94057] to-[#FF7EB3] px-3 py-1 rounded-full shadow">
                    {feature.highlight}
                  </span>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-[#2A1F2D] mb-3">
                  {feature.title}
                </h3>
                <p className="text-sm md:text-base text-[#2A1F2D]/75 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 md:mb-16">
            <div className="inline-block mb-3">
              <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#E94057] opacity-70">
                Why People Trust Us
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#2A1F2D] via-[#E94057] to-[#4b164c] bg-clip-text text-transparent">
                Built for Real Connections
              </span>
            </h2>
            <p className="text-base md:text-lg text-[#2A1F2D]/60 max-w-2xl mx-auto font-medium">
              We combine safety, authenticity, and thoughtful product design to help
              people connect with confidence.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {trustPillars.map((pillar) => (
              <article
                key={pillar.title}
                className="bg-white/90 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-white/50 shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <h3 className="text-xl font-bold text-[#2A1F2D] mb-3">
                  {pillar.title}
                </h3>
                <p className="text-sm md:text-base text-[#2A1F2D]/75 leading-relaxed">
                  {pillar.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-white via-pink-50/30 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block mb-3">
              <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#E94057] opacity-70">
                Our Purpose
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#2A1F2D] via-[#E94057] to-[#4b164c] bg-clip-text text-transparent">
                Our Mission
              </span>
            </h2>
            <div className="w-24 h-0.5 bg-gradient-to-r from-transparent via-[#E94057] to-transparent mx-auto" />
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-8 md:p-12 text-center relative overflow-hidden border border-white/50 shadow-2xl">
              <div className="absolute top-6 left-6">
                <QuoteSVG className="w-8 h-8 text-[#E94057]/20" />
              </div>
              <div className="absolute bottom-6 right-6">
                <QuoteSVG className="w-8 h-8 text-[#E94057]/20 transform rotate-180" />
              </div>
              
              <div className="relative z-10">
                <p className="text-lg md:text-xl lg:text-2xl font-bold text-[#2A1F2D] leading-relaxed mb-6">
                  To create a{" "}
                  <span className="bg-gradient-to-r from-[#E94057] to-[#FF7EB3] bg-clip-text text-transparent">
                    safe, authentic, and inclusive
                  </span>{" "}
                  platform where people across India can find meaningful connections and build lasting relationships.
                </p>
                
                <div className="w-32 h-0.5 bg-gradient-to-r from-transparent via-[#E94057] to-transparent mx-auto mb-6" />
                
                <p className="text-base md:text-lg text-[#2A1F2D]/70 leading-relaxed">
                  We're not just another dating app. We're a{" "}
                  <span className="font-bold text-[#2A1F2D]">community built on trust, respect, and genuine human connection</span>. 
                  Every feature we build is guided by our commitment to helping you find your perfect match.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap Section */}
      <section className="relative py-16 md:py-24 overflow-hidden bg-gradient-to-b from-white to-pink-50/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block mb-3">
              <span className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#E94057] opacity-70">
                What We Are Building
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-[#2A1F2D] via-[#E94057] to-[#4b164c] bg-clip-text text-transparent">
                Our Product Roadmap
              </span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {roadmap.map((item) => (
              <article
                key={item.title}
                className="relative rounded-3xl border border-white/60 bg-white/90 backdrop-blur-sm p-6 md:p-8 shadow-lg"
              >
                <span className="inline-flex mb-4 rounded-full bg-[#E94057]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#E94057]">
                  {item.title}
                </span>
                <p className="text-sm md:text-base text-[#2A1F2D]/75 leading-relaxed">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-[#E94057]/5 via-transparent to-[#FF7EB3]/5 rounded-3xl p-8 md:p-12 relative overflow-hidden border border-white/50 shadow-2xl">
            <div className="absolute -top-8 -right-8 w-32 h-32">
              <HeartSVG className="w-full h-full text-[#E94057]/10" />
            </div>
            <div className="absolute -bottom-8 -left-8 w-32 h-32">
              <HeartSVG className="w-full h-full text-[#FF7EB3]/10" />
            </div>
            
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-6">
                <HeartSVG className="w-full h-full text-[#E94057]" />
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-6">
                <span className="bg-gradient-to-r from-[#2A1F2D] via-[#E94057] to-[#4b164c] bg-clip-text text-transparent">
                  Join the Pookiey Community
                </span>
              </h2>
              
              <p className="text-base md:text-lg text-[#2A1F2D]/70 mb-8 max-w-xl mx-auto font-medium">
                Start your journey to finding meaningful connections today. Your perfect match is waiting.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link
                  href="/auth"
                  className="group relative px-8 py-3 sm:px-10 sm:py-4 bg-gradient-to-r from-[#E94057] to-[#FF7EB3] text-white font-bold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10 text-sm sm:text-base">Get Started</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#FF7EB3] to-[#E94057] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
                <Link
                  href="/"
                  className="px-8 py-3 sm:px-10 sm:py-4 bg-white/90 backdrop-blur-sm text-[#E94057] font-bold rounded-full border-2 border-[#E94057] hover:bg-[#E94057] hover:text-white transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base"
                >
                  Learn More
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}