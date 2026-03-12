import type { Metadata } from "next";
import localFont from "next/font/local";
import { Playfair_Display, Great_Vibes, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import Providers from "./providers";
import Layout from "@/components/Layout";

const hellix = localFont({
  src: [
    {
      path: "./fonts/Hellix-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Hellix-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/Hellix-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/Hellix-RegularItalic.ttf",
      weight: "400",
      style: "italic",
    },
  ],
  variable: "--font-hellix",
  display: "swap",
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-playfair",
  display: "swap",
});

const greatVibes = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-great-vibes",
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pookiey",
  description:
    "Manage your Pookiey dating subscription, track payments, and unlock premium perks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={hellix.variable}>
      <body className={`${hellix.variable} ${playfairDisplay.variable} ${greatVibes.variable} ${cormorantGaramond.variable} antialiased`}>
        <Providers>
          <Layout>{children}</Layout>
        </Providers>
      </body>
    </html>
  );
}
