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
    <>
      <OnboardingProgress currentStep={5} completedStep={vendor.onboarding_step} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">Get paid for your classes</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Connect your Stripe account to accept payments from students.
          </p>
        </div>
        <Step5Stripe isConnected={isConnected} stripeAccountId={vendor.stripe_account_id} />
      </main>
    </>
  );
}
