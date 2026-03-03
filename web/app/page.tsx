import type { Metadata } from "next"
import Link from "next/link"
import AuthRedirect from "../components/landing/AuthRedirect"
import FAQAccordion from "../components/landing/FAQAccordion"
import HeroCarouselResponsive from "../components/landing/HeroCarouselResponsive"

export const metadata: Metadata = {
  title: "Best Dating App in India | Pookiey - Real Connections",
  description:
    "Pookiey is India's trusted dating app for meaningful connections. Safe platform for casual dating and serious relationships across major Indian cities.",
  keywords: [
    "dating app in India",
    "best dating app in India",
    "dating apps in Bangalore",
    "dating apps in Hyderabad",
    "dating apps in Chennai",
    "dating apps in Delhi",
    "dating apps in Mumbai",
    "dating apps in Pune",
    "dating apps in Kolkata",
    "India dating site",
    "online dating India",
    "casual dating",
    "serious relationships",
  ],
  openGraph: {
    title: "Best Dating App in India | Pookiey - Real Connections",
    description:
      "Pookiey is India's trusted dating app for meaningful connections. Safe platform for casual dating and serious relationships.",
    type: "website",
    locale: "en_IN",
    url: "https://pookiey.com",
    siteName: "Pookiey",
  },
  twitter: {
    card: "summary_large_image",
    title: "Best Dating App in India | Pookiey",
    description:
      "Pookiey is India's trusted dating app for meaningful connections.",
  },
  alternates: {
    canonical: "/",
    languages: {
      en: "https://pookiey.com",
      "en-IN": "https://pookiey.com",
    },
  },
};

const heroSlidesMobile = [
  {
    "url": "https://pookiey.s3.amazonaws.com/websiteImages/pookiey-modern-dating-app.jpg",
    "alt": "Pookiey modern dating app interface for finding meaningful connections"
  },
  {
    "url": "https://pookiey.s3.amazonaws.com/websiteImages/pookiey-start-your-love-story.jpg",
    "alt": "Start your love story with Pookiey online dating platform"
  },
  {
    "url": "https://pookiey.s3.amazonaws.com/websiteImages/pookiey-meet-new-people.jpg",
    "alt": "Meet new people and build real relationships on Pookiey dating app"
  },
  {
    "url": "https://pookiey.s3.amazonaws.com/websiteImages/pookiey-fun-online-dating.jpg",
    "alt": "Fun and engaging online dating experience with Pookiey"
  },
  {
    "url": "https://pookiey.s3.amazonaws.com/websiteImages/pookiey-swipe-match-chat.jpg",
    "alt": "Swipe, match and chat securely on Pookiey dating app"
  }
]

const heroSlidesDesktop =[
  {
    "url": "https://pookiey.s3.amazonaws.com/websiteImages/pookiey-modern-dating-app.jpg",
    "alt": "Pookiey modern dating app interface for finding meaningful connections"
  },
  {
    "url": "https://pookiey.s3.amazonaws.com/websiteImages/pookiey-start-your-love-story.jpg",
    "alt": "Start your love story with Pookiey online dating platform"
  },
  {
    "url": "https://pookiey.s3.amazonaws.com/websiteImages/pookiey-meet-new-people.jpg",
    "alt": "Meet new people and build real relationships on Pookiey dating app"
  },
  {
    "url": "https://pookiey.s3.amazonaws.com/websiteImages/pookiey-fun-online-dating.jpg",
    "alt": "Fun and engaging online dating experience with Pookiey"
  },
  {
    "url": "https://pookiey.s3.amazonaws.com/websiteImages/pookiey-swipe-match-chat.jpg",
    "alt": "Swipe, match and chat securely on Pookiey dating app"
  }
]

const features = [
  {
    id: 1,
    label: "SECURITY",
    title: "Safety For Women",
    description: "We keep the security of our women at core. Hence, we do not allow users to take screenshots or download pictures from the app.",
    image: "/can't_take_screenshot.png",
    imageAlt: "Security feature",
    textPosition: "left" as const, // text left, image right
  },
  {
    id: 2,
    label: "PERFECT MATCHMAKING",
    title: "Compatibility Quiz",
    description: "Get a clear picture regarding your compatibility! Take a fun compatibility quiz & answer questions to understand the other person better!",
    image: "/compatibility.png",
    imageAlt: "Compatibility quiz feature",
    textPosition: "right" as const, // image left, text right
  },
  {
    id: 3,
    label: "REAL CONNECTIONS",
    title: "Meaningful Conversations",
    description: "Build deeper connections through thoughtful conversations. Our platform encourages authentic interactions that lead to lasting relationships.",
    image: "/message.png",
    imageAlt: "Meaningful conversations feature",
    textPosition: "left" as const, // text left, image right
  },
  {
    id: 4,
    label: "VERIFIED PROFILES",
    title: "Trust & Authenticity",
    description: "Every profile goes through verification to ensure authenticity. Connect with real people who are genuinely looking for meaningful relationships.",
    image: "/trust_and_authenticity.png",
    imageAlt: "Verified profiles feature",
    textPosition: "right" as const, // image left, text right
  },
  {
    id: 5,
    label: "SMART MATCHING",
    title: "Find Your Perfect Match",
    description: "Our advanced algorithm learns your preferences and suggests matches that align with your values, interests, and relationship goals.",
    image: "/find_your_perfect_match.png",
    imageAlt: "Smart matching feature",
    textPosition: "left" as const, // text left, image right
  },
];


export default function LandingPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Pookiey",
    applicationCategory: "DatingApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    description:
      "Best dating app in India for real and meaningful connections. Trusted dating platform for casual dating and serious relationships.",
    url: "https://pookiey.com",
  };

  const organizationStructuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Pookiey",
    url: "https://pookiey.com",
    logo: "https://pookiey.com/favicon.ico",
    description:
      "Pookiey is India's trusted dating app for meaningful connections. Safe platform for casual dating and serious relationships.",
    sameAs: [
      "https://www.facebook.com/profile.php?id=61586065021476",
      "https://www.instagram.com/pookiey111/",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "Customer Service",
      availableLanguage: ["English", "Hindi"],
    },
    areaServed: {
      "@type": "Country",
      name: "India",
    },
  };

  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is Pookiey a safe dating app in India?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Pookiey is designed with user safety and privacy in mind. It offers secure login, profile control, and protected communication so users can feel comfortable while using the platform.",
        },
      },
      {
        "@type": "Question",
        name: "Who can use the Pookiey dating app?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Any adult aged 18 and above can use Pookiey. It is suitable for students, working professionals, single adults, and people returning to dating. Users from different cities across India can use the platform easily.",
        },
      },
      {
        "@type": "Question",
        name: "Is Pookiey good for serious relationships?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Pookiey supports users who are looking for serious and long-term relationships. It encourages honest profiles and meaningful conversations, which help users build genuine connections.",
        },
      },
      {
        "@type": "Question",
        name: "Can Pookiey be used for casual dating?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Pookiey also supports casual dating. Users can explore connections at their own pace while keeping interactions respectful and clear.",
        },
      },
      {
        "@type": "Question",
        name: "Is Pookiey free to use?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Pookiey offers free access to help users get started. Free users can create profiles and explore matches. Premium features are available for users who want additional tools and better visibility.",
        },
      },
      {
        "@type": "Question",
        name: "Does Pookiey work in all Indian cities?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, Pookiey supports users across India. Whether you are using dating apps in Bangalore, dating apps in Hyderabad, dating apps in Chennai, dating apps in Delhi, dating apps in Kolkata, or smaller cities, the experience remains consistent.",
        },
      },
    ],
  };

  return (
    <>
      <AuthRedirect />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationStructuredData),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
      />

      <div className="relative min-h-screen overflow-hidden">
        {/* Top Carousel (full width, no container) */}
        <HeroCarouselResponsive slidesMobile={heroSlidesMobile} slidesDesktop={heroSlidesDesktop} />

        {/* Hero Text Banner */}
        <section className="relative py-16 sm:py-20 md:py-32 lg:py-40 overflow-hidden min-h-[350px] sm:min-h-[400px] md:min-h-[500px] lg:min-h-[600px] flex items-center">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-50/80 via-pink-100/90 to-purple-100/80"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(233,64,87,0.1),transparent_70%)]"></div>
          
          {/* Decorative Heart SVGs - Enhanced */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Top Left Hearts */}
            <svg className="absolute top-4 left-2 sm:left-4 md:left-12 w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 text-[#E94057]/20 rotate-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <svg className="absolute top-12 left-8 sm:left-12 md:left-24 w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 text-[#FF7EB3]/15 -rotate-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <svg className="absolute top-20 left-4 sm:left-6 md:left-16 w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 text-[#E94057]/12 rotate-30" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            
            {/* Top Right Hearts */}
            <svg className="absolute top-8 right-4 sm:right-8 md:right-16 w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 lg:w-18 lg:h-18 text-[#FF7EB3]/25 rotate-45" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <svg className="absolute top-20 right-2 sm:right-4 md:right-12 w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-[#E94057]/15 -rotate-30" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <svg className="absolute top-16 right-12 sm:right-16 md:right-24 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#FF7EB3]/18 rotate-60" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            
            {/* Bottom Left Hearts */}
            <svg className="absolute bottom-8 left-4 sm:left-8 md:left-20 w-12 h-12 sm:w-14 sm:h-14 md:w-20 md:h-20 lg:w-24 lg:h-24 text-[#4b164c]/15 rotate-[-15deg]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <svg className="absolute bottom-16 left-2 sm:left-4 md:left-12 w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 text-[#FF7EB3]/20 rotate-25" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <svg className="absolute bottom-24 left-6 sm:left-10 md:left-16 w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 text-[#E94057]/12 -rotate-20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            
            {/* Bottom Right Hearts */}
            <svg className="absolute bottom-12 right-4 sm:right-12 md:right-24 w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 text-[#E94057]/20 -rotate-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <svg className="absolute bottom-20 right-2 sm:right-4 md:right-16 w-5 h-5 sm:w-6 sm:h-6 md:w-10 md:h-10 text-[#4b164c]/20 rotate-45" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <svg className="absolute bottom-28 right-8 sm:right-12 md:right-20 w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#FF7EB3]/15 -rotate-25" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            
            {/* Center Side Hearts (left) */}
            <svg className="absolute top-1/2 -translate-y-1/2 left-0 sm:left-2 md:left-8 w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 text-[#E94057]/10 rotate-[-20deg]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <svg className="absolute top-1/2 -translate-y-1/2 left-4 sm:left-6 md:left-16 w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 text-[#FF7EB3]/12 rotate-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            
            {/* Center Side Hearts (right) */}
            <svg className="absolute top-1/2 -translate-y-1/2 right-0 sm:right-2 md:right-8 w-12 h-12 sm:w-16 sm:h-16 md:w-24 md:h-24 lg:w-32 lg:h-32 text-[#FF7EB3]/10 rotate-20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <svg className="absolute top-1/2 -translate-y-1/2 right-4 sm:right-6 md:right-16 w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 text-[#E94057]/12 -rotate-10" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            
            {/* Additional floating hearts */}
            <svg className="absolute top-1/4 left-1/4 w-3 h-3 sm:w-4 sm:h-4 md:w-6 md:h-6 text-[#E94057]/15 rotate-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <svg className="absolute top-3/4 right-1/3 w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 text-[#FF7EB3]/15 -rotate-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <svg className="absolute bottom-1/4 left-1/3 w-4 h-4 sm:w-5 sm:h-5 md:w-7 md:h-7 text-[#4b164c]/15 rotate-30" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <svg className="absolute top-1/3 right-1/4 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-[#E94057]/12 -rotate-45" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            <svg className="absolute bottom-1/3 left-1/5 w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-[#FF7EB3]/12 rotate-20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          </div>
          
          <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 md:px-8 z-10">
            <div className="text-center">
              <h1 
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold leading-[1.2] sm:leading-[1.1] tracking-tight px-2"
              >
                <span className="block">Where </span>
                <span className="text-[#E94057] font-extrabold block sm:inline">Hearts Meet</span>
                <span className="hidden sm:inline"> & </span>
                <span className="block sm:inline mt-1 sm:mt-0">Love </span>
                <span className="text-[#FF7EB3] font-extrabold block sm:inline">Begins</span>
                <br className="hidden lg:block" />
                <span className="block mt-2 sm:mt-1 lg:mt-0 lg:inline">Find Your </span>
                <span className="text-[#4b164c] font-extrabold block sm:inline">Perfect Match</span>
              </h1>
              <p className="mt-4 sm:mt-6 md:mt-8 lg:mt-10 text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-[#2A1F2D]/80 font-medium max-w-2xl mx-auto px-2">
                India's Most Trusted Dating App for Real Connections
              </p>
            </div>
          </div>
        </section>

        {/* Our Features Title Section */}
        <section className="relative py-8 md:py-12 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-50/80 via-pink-100/90 to-purple-100/80"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(233,64,87,0.1),transparent_70%)]"></div>
          <div className="relative">
            <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
              <div className="text-center">
                <h2 
                  className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold"
                >
                  <span className="bg-gradient-to-br from-[#2A1F2D] via-[#4b164c] to-[#E94057] bg-clip-text text-transparent">
                    Our Features
                  </span>
                </h2>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="relative py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-50/80 via-pink-100/90 to-purple-100/80"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(233,64,87,0.1),transparent_70%)]"></div>
          <div className="relative">
          <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
            <div className="grid gap-20 md:gap-32">
              {features.map((feature, index) => (
                <div
                  key={feature.id}
                  className={`grid items-center gap-12 md:grid-cols-2 ${
                    feature.textPosition === "right" ? "md:grid-flow-dense" : ""
                  }`}
                >
                  {/* Text Content */}
                  <div
                    className={`flex flex-col justify-center text-center md:text-left ${
                      feature.textPosition === "right" ? "md:col-start-2" : ""
                    }`}
                  >
                    {/* Label with decorative underline - Hidden on mobile */}
                    <div className="hidden md:inline-block relative mb-8 group">
                      <span className="text-xs md:text-sm font-semibold tracking-[0.1em] uppercase text-[#E94057] relative z-10 inline-block px-2 py-1 bg-gradient-to-r from-[#E94057]/10 to-transparent rounded-sm">
                        {feature.label}
                      </span>
                      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#E94057]/40 to-[#FF7EB3]/60 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                    </div>
                    
                    {/* Title with gradient */}
                    <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl mb-6 md:mb-10 leading-[1.15] relative mx-auto md:mx-0">
                      <span 
                        className="font-bold bg-gradient-to-br from-[#2A1F2D] via-[#4b164c] to-[#E94057] bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(233,64,87,0.2)] inline-block"
                      >
                        {feature.title}
                      </span>
                      {/* Decorative heart accent */}
                      <span 
                        className="absolute -top-3 -right-6 md:-right-8 text-3xl md:text-4xl opacity-25 transform rotate-12"
                      >
                        ♥
                      </span>
                    </h2>
                    
                    {/* Description */}
                    <div className="relative mx-auto md:mx-0">
                      <p 
                        className="text-base sm:text-lg md:text-xl lg:text-2xl text-[#2A1F2D] leading-[1.9] max-w-xl font-normal tracking-tight relative z-10"
                        style={{ color: '#1a1620' }}
                      >
                        {feature.description}
                      </p>
                      {/* Decorative quote mark */}
                      <span 
                        className="absolute -left-4 -top-2 text-5xl sm:text-6xl md:text-7xl text-[#E94057]/10 font-bold leading-none"
                      >
                        "
                      </span>
                    </div>
                  </div>

                  {/* Single Image */}
                  <div
                    className={`relative flex items-end justify-center ${
                      feature.textPosition === "right"
                        ? "md:col-start-1 md:row-start-1 md:justify-start"
                        : "md:justify-end"
                    }`}
                  >
                    <div className="relative inline-block max-w-md">
                      <div className="relative inline-block">
                        {/* Pink circular gradient for index 3 */}
                        {index === 3 && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                            <div className="w-full h-full rounded-full bg-[radial-gradient(circle_at_center,rgba(233,64,87,0.15),rgba(255,126,179,0.08),transparent_70%)]"></div>
                          </div>
                        )}
                        <img
                          src={feature.image}
                          alt={feature.imageAlt}
                          className="relative z-10 w-full h-auto block"
                        />
                        {/* Shadow at bottom of image */}
                        <div className="absolute bottom-30 left-1/2 -translate-x-2/3 w-3/6 h-4 bg-black/40 blur-lg rounded-full z-0 translate-y-1/2"></div>
                      </div>
                    </div>
                  </div>                </div>
              ))}
            </div>
          </div>
          </div>
        </section>

        {/* How it works - Enhanced Section */}
        <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-50/80 via-pink-100/90 to-purple-100/80"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(233,64,87,0.1),transparent_70%)]"></div>
          
          {/* Decorative elements */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-20 left-10 w-32 h-32 bg-[#E94057]/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-20 right-10 w-40 h-40 bg-[#FF7EB3]/5 rounded-full blur-3xl"></div>
          </div>

          <div className="relative">
            <div className="mx-auto w-full max-w-7xl px-4 md:px-8">
              {/* Section Header */}
              <div className="text-center mb-12 md:mb-16 lg:mb-20">
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                  <span className="bg-gradient-to-br from-[#2A1F2D] via-[#4b164c] to-[#E94057] bg-clip-text text-transparent">
                    How It Works
                  </span>
                </h2>
                <p className="text-base sm:text-lg md:text-xl text-[#2A1F2D]/70 max-w-2xl mx-auto">
                  Your journey to finding meaningful connections in just four simple steps
                </p>
              </div>

              {/* Steps Grid */}
              <div className="grid gap-8 sm:gap-10 md:gap-12 lg:grid-cols-4">
                {[
                  {
                    step: 1,
                    title: "Create Profile",
                    description: "Sign up and build your authentic profile. Add photos, share your interests, and let your personality shine through.",
                    icon: "👤",
                    color: "from-[#E94057] to-[#FF7EB3]",
                  },
                  {
                    step: 2,
                    title: "Discover Matches",
                    description: "Our smart algorithm finds compatible matches based on your preferences, values, and relationship goals.",
                    icon: "💝",
                    color: "from-[#FF7EB3] to-[#E94057]",
                  },
                  {
                    step: 3,
                    title: "Start Chatting",
                    description: "Break the ice with meaningful conversations. Get to know each other through our secure messaging platform.",
                    icon: "💬",
                    color: "from-[#4b164c] to-[#E94057]",
                  },
                  {
                    step: 4,
                    title: "Build Connection",
                    description: "Take your connection to the next level. Plan meetups, share experiences, and build lasting relationships.",
                    icon: "🌟",
                    color: "from-[#E94057] to-[#4b164c]",
                  },
                ].map((item, idx) => (
                  <div
                    key={item.step}
                    className="relative group"
                  >
                    {/* Connecting Line (Desktop only) */}
                    {idx < 3 && (
                      <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-[#E94057]/30 via-[#FF7EB3]/30 to-transparent z-0">
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#E94057] rounded-full"></div>
                      </div>
                    )}

                    {/* Step Card */}
                    <div className="relative h-full glass-card rounded-3xl p-6 md:p-8 transition-all duration-300 hover:scale-105 hover:shadow-xl group-hover:shadow-[0_20px_60px_-15px_rgba(233,64,87,0.3)]">
                      {/* Step Number Badge */}
                      <div className="relative mb-6">
                        <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-20 blur-xl rounded-full`}></div>
                        <div className={`relative w-16 h-16 md:w-20 md:h-20 mx-auto rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center shadow-lg`}>
                          <span className="text-3xl md:text-4xl">{item.icon}</span>
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                          <span className="text-sm font-bold text-[#E94057]">{item.step}</span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="text-center">
                        <h3 className="text-xl md:text-2xl font-bold text-[#2A1F2D] mb-3 md:mb-4">
                          {item.title}
                        </h3>
                        <p className="text-sm md:text-base text-[#2A1F2D]/70 leading-relaxed">
                          {item.description}
                        </p>
                      </div>

                      {/* Decorative Heart */}
                      <div className="absolute bottom-4 right-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <svg className="w-8 h-8 text-[#E94057]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Call to Action */}
              <div className="mt-12 md:mt-16 text-center">
                <Link
                  href="/auth"
                  className="inline-block px-8 py-4 bg-gradient-to-r from-[#E94057] to-[#FF7EB3] text-white font-semibold rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
                >
                  Get Started Today
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section (untouched component) */}
        <section id="faq" className="relative py-12 md:py-16 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-50/80 via-pink-100/90 to-purple-100/80"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(233,64,87,0.1),transparent_70%)]"></div>
          <div className="relative">
          <div className="mx-auto w-full max-w-6xl px-4 md:px-8">
            <div className="mb-6 md:mb-8">
              <h2 className="text-xl font-semibold text-[#2A1F2D] md:text-2xl">
                FAQs
              </h2>
            </div>
            <FAQAccordion />
          </div>
          </div>
        </section>
      </div>
    </>
  )
}
