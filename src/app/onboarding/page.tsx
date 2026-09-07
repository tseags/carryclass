import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { isUserRole, STUDENT_ROLE, VENDOR_ROLE } from "@/lib/auth/roles";
import { VENDOR_SIGNUP_INTENT_COOKIE } from "@/lib/auth/signup-intent";

export default async function OnboardingRouterPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const user = await currentUser();
  if (!user) {
    redirect("/sign-in");
  }

  const cookieStore = await cookies();
  if (cookieStore.get(VENDOR_SIGNUP_INTENT_COOKIE)?.value === "vendor") {
    redirect("/instructors/claim");
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

