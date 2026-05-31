import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Onboarding",
  robots: NOINDEX_ROBOTS,
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
