import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateVendorProfile } from "@/lib/onboarding-db";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { Step4Cancellation } from "@/components/onboarding/Step4Cancellation";

export default async function Step4Page() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?intent=vendor");

  const vendor = await getOrCreateVendorProfile(userId);
  if (vendor.is_published) redirect("/dashboard/vendor");

  return (
    <>
      <OnboardingProgress currentStep={4} completedStep={vendor.onboarding_step} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">
            What&apos;s your cancellation policy?
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            This will be shown to students before they book. Choose the policy that works best for you.
          </p>
        </div>
        <Step4Cancellation vendor={vendor} />
      </main>
    </>
  );
}
