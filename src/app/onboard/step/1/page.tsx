import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateVendorProfile, prefillVendorFromEnriched } from "@/lib/onboarding-db";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { Step1Profile } from "@/components/onboarding/Step1Profile";

export default async function Step1Page() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?intent=vendor");

  const baseVendor = await getOrCreateVendorProfile(userId);
  if (baseVendor.is_published) redirect("/dashboard/vendor");

  const { vendor, prefilled } = await prefillVendorFromEnriched(baseVendor);

  return (
    <div className="container-default w-container">
      <div className="mx-auto max-w-3xl">
        <OnboardingProgress currentStep={1} completedStep={vendor.onboarding_step} />
        <div className="rounded-2xl border border-neutral-300/70 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h1 className="onboard-step-title">Your instructor profile</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Fill in your details so students can find and book with you. All fields save independently.
            </p>
          </div>
          <Step1Profile vendor={vendor} prefilled={prefilled} />
        </div>
      </div>
    </div>
  );
}
