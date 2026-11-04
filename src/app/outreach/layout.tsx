import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Outreach",
  robots: NOINDEX_ROBOTS,
};

export default function OutreachLayout({ children }: { children: React.ReactNode }) {
  return children;
}
