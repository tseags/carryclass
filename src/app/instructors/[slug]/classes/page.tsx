import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AvailableClasses } from "@/components/instructors/AvailableClasses";
import { getVendorBySlug } from "@/lib/vendors-db";
import { directoryCcwCards } from "@/lib/instructor-catalog";
import { getOnboardingPublicCatalog } from "@/lib/public-instructor-classes";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return {};
  return pageMetadata({
    title: `Classes — ${vendor.name}`,
    description: `CCW and other classes from ${vendor.name}, with prices.`,
    path: `/instructors/${vendor.slug}/classes`,
  });
}

export default async function InstructorClassesPage({ params }: PageProps) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) notFound();
  if (vendor.slug !== slug) {
    permanentRedirect(`/instructors/${vendor.slug}/classes`);
  }

  const catalog = await getOnboardingPublicCatalog(vendor.slug);
  const ccw = catalog ? catalog.ccw : directoryCcwCards(vendor);
  const other = catalog?.other ?? [];

  return (
    <div className="min-h-screen bg-[#efeee8]">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-[calc(var(--header-offset)+1.5rem)] sm:px-6">
        <nav className="mb-6 text-sm text-zinc-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-zinc-800">Home</Link>
          <span className="mx-2">/</span>
          <Link href={`/instructors/${vendor.slug}`} className="hover:text-zinc-800">
            {vendor.name}
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-zinc-900">Classes</span>
        </nav>
        <AvailableClasses slug={vendor.slug} ccw={ccw} other={other} />
      </main>
      <Footer />
    </div>
  );
}
