import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isUserRole, STUDENT_ROLE } from "@/lib/auth/roles";

export default async function DashboardRouterPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const role = user.publicMetadata.role;

  if (!isUserRole(role)) {
    // Default to student if not set.
    redirect("/onboarding");
  }

  redirect(role === STUDENT_ROLE ? "/dashboard/student" : "/dashboard/vendor");
}

