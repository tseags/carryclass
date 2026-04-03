import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getCountyDisplayName } from "@/data/counties";
import { getVendorsByCounty } from "@/data/vendors";
import { getCountyImageUrl } from "@/data/county-images";
import { CALIFORNIA_COUNTIES } from "@/data/counties";

export const metadata = {
  title: "Find CCW Training by County in California",
  description:
    "Browse all California counties to find approved CCW instructors and training vendors near you.",
};

export default function CaliforniaPage() {
  const countiesWithImages = ["san-diego", "orange", "riverside", "los-angeles", "sacramento", "san-bernardino"];
  const otherCounties = CALIFORNIA_COUNTIES.filter(
    (c) => !countiesWithImages.includes(c)
  );

  return (
    <>
      <Header />
      <section className="section-3">
        <div className="w-layout-blockcontainer container-2 w-container">
          <div className="div-block-10">
            <nav className="vendors-hero-breadcrumb mg-bottom-12px text-sm">
              <Link href="/" className="hover:underline">
                Home
              </Link>
              <span className="mx-2">/</span>
              <span className="text-zinc-900">Counties</span>
            </nav>
            <h1 className="mg-bottom-12px">Find CCW Training by County in California</h1>
            <p className="paragraph-5">
              Browse all California counties to find approved CCW instructors and training vendors near
              you. Each county below links to its own sheriff-approved vendor list and renewal
              information.
            </p>
          </div>

          <form
            action="/ca"
            method="get"
            className="card pd-44px---32px filter-bar mg-bottom-0"
          >
            <div className="position-relative---z-index-1 mg-bottom-0 w-form max-w-2xl mx-auto">
              <div className="position-relative---z-index-1 flex-horizontal">
                <img
                  src="/images/search-input-icon-directory-webflow-ecommerce-template.svg"
                  alt=""
                  className="icon-inside-input"
                />
                <input
                  name="q"
                  type="search"
                  placeholder="Find Your County"
                  className="input icon-left-inside search-btn-inside county-search w-input"
                />
              </div>
              <div className="btn-inside-input-wrapper">
                <input type="submit" className="btn-primary bg-secondary-2 w-button" value="Search" />
              </div>
            </div>
          </form>
        </div>
      </section>

      <div className="section bg-neutral-200">
        <div className="container-default w-container">
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...countiesWithImages, ...otherCounties].map((slug) => {
              const name = getCountyDisplayName(slug);
              const imageUrl = getCountyImageUrl(slug);
              const vendorCount = getVendorsByCounty(slug).length;

              return (
                <Link
                  key={slug}
                  href={`/ca/${slug}`}
                  className="group block overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="relative aspect-[16/10] bg-zinc-200">
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        alt={name}
                        fill
                        className="object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-zinc-500">{name}</div>
                    )}
                  </div>
                  <div className="p-4">
                    <span className="font-semibold text-zinc-900 group-hover:underline">{name} →</span>
                    <p className="mt-1 text-sm text-zinc-500">
                      Find approved CCW training and renewal courses in {name} County.
                      {vendorCount > 0 ? ` ${vendorCount} vendor${vendorCount === 1 ? "" : "s"}.` : ""}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
