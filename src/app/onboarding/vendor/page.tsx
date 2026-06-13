import { redirect } from "next/navigation";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { VENDOR_ROLE } from "@/lib/auth/roles";

export default async function VendorOnboardingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?intent=vendor");
  }

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in?intent=vendor");
  }

  if (user.publicMetadata.role !== VENDOR_ROLE) {
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: { role: VENDOR_ROLE },
    });
  }

  redirect("/onboard");
}

