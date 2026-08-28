import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ClaimListingFlow } from "@/components/claim/ClaimListingFlow";
import { pageMetadata } from "@/lib/seo";
import { getVendorProfile } from "@/lib/onboarding-db";
import { userHasClaimedListing } from "@/lib/claim-db";
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
      <main className="bg-neutral-200">
        <section className="section">
          <div className="container-default w-container">
            <div className="top-section-card home">
              {userId ? (
                <ClaimListingFlow />
              ) : (
                <div className="inner-container _480px _100-tablet">
                  <h1 className="mg-bottom-12px">Claim your CCW listing</h1>
                  <p className="mg-bottom-20px">
                    Sign in as an instructor, find your existing sheriff-approved
                    page, and verify with the email or phone already on that
                    listing. You cannot create a new listing here.
                  </p>
                  <div className="buttons-row">
                    <Link
                      href="/sign-up?intent=vendor"
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
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
