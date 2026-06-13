import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  getOrCreateVendorProfile,
  getClassTypes,
  getCalendarClasses,
} from "@/lib/onboarding-db";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { Step6Review } from "@/components/onboarding/Step6Review";

export default async function Step6Page() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?intent=vendor");

  const vendor = await getOrCreateVendorProfile(userId);
  if (vendor.is_published) redirect("/dashboard/vendor");

  const [classTypes, calendarClasses] = await Promise.all([
    getClassTypes(vendor.id),
    getCalendarClasses(vendor.id),
  ]);

  return (
    <>
      <OnboardingProgress currentStep={6} completedStep={vendor.onboarding_step} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-zinc-900">Review &amp; go live</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Everything look good? Hit &ldquo;Publish&rdquo; to make your listing live on CarryClass.
          </p>
        </div>
        <Step6Review
          vendor={vendor}
          classTypes={classTypes}
          calendarClasses={calendarClasses}
        />
      </main>
    </>
  );
}
