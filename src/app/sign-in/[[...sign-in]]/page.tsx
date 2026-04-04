"use client";

import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20">
        <SignIn forceRedirectUrl="/dashboard" />
      </div>
    </main>
  );
}

