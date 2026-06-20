import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getOrCreateVendorProfile } from "@/lib/onboarding-db";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { Step5Stripe } from "@/components/onboarding/Step5Stripe";

export default async function Step5Page() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?intent=vendor");

  const vendor = await getOrCreateVendorProfile(userId);
  if (vendor.is_published) redirect("/dashboard/vendor");

  const isConnected = Boolean(vendor.stripe_account_id);

  return (
    <div className="container-default w-container">
      <div className="mx-auto max-w-3xl">
        <OnboardingProgress currentStep={5} completedStep={vendor.onboarding_step} />
        <div className="rounded-2xl border border-neutral-300/70 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-6">
            <h1 className="onboard-step-title">Get paid for your classes</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Connect your Stripe account to accept payments from students.
            </p>
          </div>
          <Step5Stripe isConnected={isConnected} stripeAccountId={vendor.stripe_account_id} />
        </div>
      </div>
    </div>
  );
}
