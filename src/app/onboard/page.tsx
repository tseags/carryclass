import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateVendorProfile } from "@/lib/onboarding-db";
import { VENDOR_ROLE } from "@/lib/auth/roles";
import { clerkClient } from "@clerk/nextjs/server";

export default async function OnboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?intent=vendor");

  const user = await currentUser();
  if (!user) redirect("/sign-in?intent=vendor");

  // Ensure vendor role is set
  if (user.publicMetadata.role !== VENDOR_ROLE) {
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: { role: VENDOR_ROLE },
    });
  }

  const vendor = await getOrCreateVendorProfile(userId, {
    name: [user.firstName, user.lastName].filter(Boolean).join(" ") || undefined,
    email: user.emailAddresses[0]?.emailAddress,
  });

  // Already published → go to dashboard
  if (vendor.is_published) {
    redirect("/dashboard/vendor");
  }

  const step = Math.min(Math.max(vendor.onboarding_step ?? 1, 1), 6);
  redirect(`/onboard/step/${step}`);
}
