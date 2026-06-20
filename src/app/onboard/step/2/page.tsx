import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateVendorProfile, getClassTypes } from "@/lib/onboarding-db";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { Step2ClassTypes } from "@/components/onboarding/Step2ClassTypes";

export default async function Step2Page() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?intent=vendor");

  const vendor = await getOrCreateVendorProfile(userId);
  if (vendor.is_published) redirect("/dashboard/vendor");

  const classTypes = await getClassTypes(vendor.id);

  return (
    <div className="container-default w-container">
      <div className="mx-auto max-w-3xl">
        <OnboardingProgress currentStep={2} completedStep={vendor.onboarding_step} />
        <div className="rounded-2xl border border-neutral-300/70 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h1 className="onboard-step-title">
              What types of CCW classes do you offer?
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Select the class types you teach and set your per-student price.
            </p>
          </div>
          <Step2ClassTypes existingTypes={classTypes} />
        </div>
      </div>
    </div>
  );
}
