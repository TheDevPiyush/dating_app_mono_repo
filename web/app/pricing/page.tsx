import type { Metadata } from "next";
import PricingClient from "./PricingClient";

export const metadata: Metadata = {
  title: "Pricing | Pookiey",
  description:
    "Explore Pookiey premium plans and benefits for better matches and conversations.",
};

export default function PricingPage() {
  return (
    <PricingClient />
  );
}
