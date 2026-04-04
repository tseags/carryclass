"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");

  const afterSignUpUrl = useMemo(() => {
    if (intent === "vendor") return "/onboarding/vendor";
    if (intent === "student") return "/onboarding/student";
    return "/onboarding";
  }, [intent]);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20">
        <SignUp signInUrl="/sign-in" forceRedirectUrl={afterSignUpUrl} />
      </div>
    </main>
  );
}

