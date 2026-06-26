"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  const searchParams = useSearchParams();
  const intent = searchParams.get("intent");
  const redirectParam = searchParams.get("redirect_url");

  const afterSignInUrl = useMemo(() => {
    if (redirectParam?.startsWith("/")) return redirectParam;
    if (intent === "vendor") return "/onboarding/vendor";
    return "/dashboard";
  }, [redirectParam, intent]);

  const signUpUrl = intent === "vendor" ? "/sign-up?intent=vendor" : "/sign-up";

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20">
        <SignIn signUpUrl={signUpUrl} forceRedirectUrl={afterSignInUrl} />
      </div>
    </main>
  );
}

