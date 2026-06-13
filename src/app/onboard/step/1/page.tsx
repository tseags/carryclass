import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateVendorProfile } from "@/lib/onboarding-db";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { Step1Profile } from "@/components/onboarding/Step1Profile";

export default async function Step1Page() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?intent=vendor");

  const vendor = await getOrCreateVendorProfile(userId);
  if (vendor.is_published) redirect("/dashboard/vendor");

  return (
    <>
      <OnboardingProgress currentStep={1} completedStep={vendor.onboarding_step} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">Your instructor profile</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Fill in your details so students can find and book with you. All fields save independently.
          </p>
        </div>
        <Step1Profile vendor={vendor} />
      </main>
    </>
  );
}
