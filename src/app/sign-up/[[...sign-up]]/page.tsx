"use client";

import { useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SignUp } from "@clerk/nextjs";
import { setVendorSignupIntentCookie } from "@/lib/auth/signup-intent";

const CLAIM_URL = "/instructors/claim";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const redirectParam = searchParams.get("redirect_url");

  const afterSignUpUrl = useMemo(() => {
    if (redirectParam?.startsWith("/")) return redirectParam;
    if (intent === "vendor") return CLAIM_URL;
    if (intent === "student") return "/onboarding/student";
    return "/onboarding";
  }, [intent, redirectParam]);

  const signInUrl = useMemo(() => {
    if (intent === "vendor") {
      return `/sign-in?intent=vendor&redirect_url=${encodeURIComponent(CLAIM_URL)}`;
    }
    return "/sign-in";
  }, [intent]);

  useEffect(() => {
    if (intent === "vendor") setVendorSignupIntentCookie();
  }, [intent]);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20">
        <SignUp
          signInUrl={signInUrl}
          forceRedirectUrl={afterSignUpUrl}
          fallbackRedirectUrl={afterSignUpUrl}
        />
      </div>
    </main>
  );
}
