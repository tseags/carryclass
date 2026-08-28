import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getVendorProfile } from "@/lib/onboarding-db";
import { userHasClaimedListing } from "@/lib/claim-db";

export default async function OnboardLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?intent=vendor");

  const claimed = await userHasClaimedListing(userId);
  if (!claimed) {
    redirect("/instructors/claim");
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-neutral-200 pt-[var(--header-offset)] pb-16">
        {children}
      </main>
      <Footer />
    </>
  );
}
