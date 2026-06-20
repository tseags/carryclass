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
    <div className="container-default w-container">
      <div className="mx-auto max-w-3xl">
        <OnboardingProgress currentStep={4} completedStep={vendor.onboarding_step} />
        <div className="rounded-2xl border border-neutral-300/70 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h1 className="onboard-step-title">
              What&apos;s your cancellation policy?
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              This will be shown to students before they book. Choose the policy that works best for you.
            </p>
          </div>
          <Step4Cancellation vendor={vendor} />
        </div>
      </div>
    </div>
  );
}
