import Link from "next/link";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ClaimListingFlow } from "@/components/claim/ClaimListingFlow";
import { ClaimProgress } from "@/components/claim/ClaimProgress";
import { pageMetadata } from "@/lib/seo";
import { getVendorProfile } from "@/lib/onboarding-db";
import { userHasClaimedListing } from "@/lib/claim-db";
import { ensureVendorRole } from "@/lib/auth/ensure-vendor-role";
import { redirect } from "next/navigation";

export const metadata = pageMetadata({
  title: "Claim Your CCW Listing",
  description:
    "Verify ownership of your existing sheriff-approved CCW listing by email or phone, then manage your CarryClass profile.",
  path: "/instructors/claim",
});

export default async function ClaimVendorListingPage() {
  const { userId } = await auth();

  if (userId) {
    await ensureVendorRole(userId, await currentUser());
    const profile = await getVendorProfile(userId);
    const claimed = (await userHasClaimedListing(userId)) || Boolean(profile?.slug);
    if (claimed) {
      if (profile?.is_published) redirect("/dashboard/vendor");
      redirect("/onboard");
    }
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-neutral-200 pt-[var(--header-offset)] pb-16">
        <div className="container-default w-container">
          <div className="mx-auto max-w-3xl">
            {userId ? (
              <ClaimListingFlow />
            ) : (
              <>
                <ClaimProgress currentStep={1} />
                <div className="rounded-2xl border border-neutral-300/70 bg-white p-6 shadow-sm sm:p-8">
                  <div className="mb-6 text-center">
                    <h1 className="onboard-step-title claim-page-title">
                      Claim your CCW listing
                    </h1>
                    <p className="mt-2 text-sm text-zinc-500">
                      Sign in, find your sheriff-approved page, and verify with the
                      email or phone already on that listing.
                    </p>
                  </div>
                  <div className="buttons-row center">
                    <Link
                      href="/sign-up?intent=vendor&redirect_url=/instructors/claim"
                      className="btn-primary button-row w-button"
                    >
                      Sign up as an instructor
                    </Link>
                    <Link
                      href="/sign-in?intent=vendor&redirect_url=/instructors/claim"
                      className="btn-secondary w-button"
                    >
                      I already have an account
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
