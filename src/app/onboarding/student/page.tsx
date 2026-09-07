import { redirect } from "next/navigation";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { STUDENT_ROLE, VENDOR_ROLE } from "@/lib/auth/roles";

export default async function StudentOnboardingPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?intent=student");
  }

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in?intent=student");
  }

  if (user.publicMetadata.role !== STUDENT_ROLE) {
    // Don't downgrade instructors who already have the vendor role.
    if (user.publicMetadata.role === VENDOR_ROLE) {
      redirect("/dashboard/vendor");
    }
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: { ...user.publicMetadata, role: STUDENT_ROLE },
    });
  }

  redirect("/dashboard/student");
}

