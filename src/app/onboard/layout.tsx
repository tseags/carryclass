import type { ReactNode } from "react";

export default function OnboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50">
      {children}
    </div>
  );
}
