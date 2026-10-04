import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { prisma } from "@/lib/db";
import { getVendorBySlug } from "@/lib/vendors-db";
import { getUpcomingSessionsForVendorSlug } from "@/lib/bookings-db";
import { getVendorProfileBySlug } from "@/lib/onboarding-db";
import { cancellationPolicyLabel } from "@/lib/cancellation-policy";
import { VendorBookForm, type SerializableSession } from "./VendorBookForm";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Directory slug can drift after publish (merge regroups on website/email).
 * Booking inventory lives on the Prisma vendor keyed by the claimed slug — use
 * that as a fallback so students can still book when the listing lookup misses.
 */
async function resolveBookableVendor(slug: string) {
  const listing = await getVendorBySlug(slug);
  if (listing) return listing;

  try {
    const bookingVendor = await prisma.vendor.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        type: true,
        city: true,
        county: true,
        state: true,
        countiesServed: true,
        classTypes: true,
        formats: true,
        acceptsBookings: true,
        createdAt: true,
      },
    });
    if (!bookingVendor?.acceptsBookings) return null;
    return {
      id: bookingVendor.id,
      slug: bookingVendor.slug,
      name: bookingVendor.name,
      type: bookingVendor.type === "company" ? ("company" as const) : ("instructor" as const),
      city: bookingVendor.city,
      county: bookingVendor.county,
      state: bookingVendor.state,
      countiesServed: bookingVendor.countiesServed,
      classTypes: bookingVendor.classTypes as Array<"initial" | "renewal" | "both">,
      formats: bookingVendor.formats as Array<"in-person" | "online" | "hybrid">,
      acceptsBookings: true,
      createdAt: bookingVendor.createdAt.toISOString().slice(0, 10),
    };
  } catch (error) {
    console.error("[book] prisma vendor fallback failed", error);
    return null;
  }
}

export default async function VendorBookPage({ params }: PageProps) {
  const { slug } = await params;
  const vendor = await resolveBookableVendor(slug);
  if (!vendor) {
    notFound();
  }
  // Listing-only instructor (no Stripe Connect): send visitors to the profile
  // rather than a dead end — contact details live there.
  if (!vendor.acceptsBookings) {
    redirect(`/instructors/${vendor.slug}`);
  }
  if (vendor.slug !== slug) {
    permanentRedirect(`/instructors/${vendor.slug}/book`);
  }

  const [bookingData, profile] = await Promise.all([
    getUpcomingSessionsForVendorSlug(vendor.slug),
    getVendorProfileBySlug(vendor.slug).catch(() => null),
  ]);
  const refundPolicy = profile
    ? cancellationPolicyLabel(
        profile.cancellation_policy,
        profile.cancellation_hours,
        profile.cancellation_refund_percent
      )
    : null;
  const sessions: SerializableSession[] =
    bookingData?.sessions?.map((s) => ({
      id: s.id,
      startsAt: s.startsAt.toISOString(),
      endsAt: s.endsAt?.toISOString() ?? null,
      title: s.title,
      classType: s.classType,
      priceCents: s.priceCents,
      spotsLeft: s.spotsLeft,
      timezone: s.timezone,
    })) ?? [];

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-[calc(var(--header-offset)+1.5rem)] sm:px-6">
        <nav className="mb-6 text-sm text-zinc-500" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-zinc-800">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/instructors" className="hover:text-zinc-800">Instructors</Link>
          <span className="mx-2">/</span>
          <Link href={`/instructors/${slug}`} className="hover:text-zinc-800">{vendor.name}</Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-zinc-900">Book</span>
        </nav>

        <h1 className="text-2xl font-bold text-zinc-900">Book a class</h1>
        <p className="mt-2 text-zinc-600">{vendor.name}</p>

        <div className="mt-8">
          <VendorBookForm
            vendorSlug={slug}
            vendorName={vendor.name}
            sessions={sessions}
            refundPolicy={refundPolicy}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
