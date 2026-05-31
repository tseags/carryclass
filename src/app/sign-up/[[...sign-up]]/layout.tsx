import type { Metadata } from "next";
import { NOINDEX_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Sign Up",
  robots: NOINDEX_ROBOTS,
};

export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
