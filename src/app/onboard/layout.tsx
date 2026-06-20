import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function OnboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-neutral-200 pt-[var(--header-offset)] pb-16">
        {children}
      </main>
      <Footer />
    </>
  );
}
