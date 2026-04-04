import { redirect } from "next/navigation";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { STUDENT_ROLE } from "@/lib/auth/roles";

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
    const client = await clerkClient();
    await client.users.updateUser(userId, {
      publicMetadata: { role: STUDENT_ROLE },
    });
  }

  redirect("/dashboard/student");
}

