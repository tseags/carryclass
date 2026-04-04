import { redirect } from "next/navigation";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { isUserRole, STUDENT_ROLE, VENDOR_ROLE } from "@/lib/auth/roles";

export default async function OnboardingRouterPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const role = user.publicMetadata.role;

  if (isUserRole(role)) {
    redirect(role === STUDENT_ROLE ? "/dashboard/student" : "/dashboard/vendor");
  }

  // Default to student role if none set.
  const client = await clerkClient();
  await client.users.updateUser(userId, {
    publicMetadata: { role: STUDENT_ROLE },
  });

  redirect("/dashboard/student");
}

