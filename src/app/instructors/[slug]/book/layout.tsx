import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Book a Class",
  robots: NOINDEX_ROBOTS,
};

export default function BookLayout({ children }: { children: React.ReactNode }) {
  return children;
}
