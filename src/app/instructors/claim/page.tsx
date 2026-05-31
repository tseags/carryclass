import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Claim Your CCW Listing",
  description:
    "CCW instructors and ranges can claim or request a listing so students can find their classes in the CarryClass directory.",
  path: "/instructors/claim",
});

export default function ClaimVendorListingPage() {
  return (
    <>
      <Header />
      <main className="bg-neutral-200">
        <section className="section">
          <div className="container-default w-container">
            <div className="top-section-card home">
              <div className="inner-container _480px _100-tablet">
                <h1 className="mg-bottom-12px">
                  Claim or add your CCW listing
                </h1>
                <p className="mg-bottom-20px">
                  If you teach CCW classes or run a range, you can claim an existing listing or
                  request a new one. This helps students find accurate information about your
                  training.
                </p>
                <div className="buttons-row">
                  <Link
                    href="/sign-up?intent=vendor"
                    className="btn-primary button-row w-button"
                  >
                    Sign up as an instructor
                  </Link>
                  <Link
                    href="/sign-in?intent=vendor"
                    className="btn-secondary w-button"
                  >
                    I already have an account
                  </Link>
                </div>
                <p className="paragraph-small color-neutral-600 mg-top-16px">
                  We&apos;ll add more self-service listing tools over time. For now, claiming your
                  listing ensures we can match your account to the right instructor listing.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

