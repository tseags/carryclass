import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ensureVendorRole } from "@/lib/auth/ensure-vendor-role";

export default async function VendorOnboardingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?intent=vendor");
  }

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in?intent=vendor");
  }

  await ensureVendorRole(userId, user);

  redirect("/instructors/claim");
}

