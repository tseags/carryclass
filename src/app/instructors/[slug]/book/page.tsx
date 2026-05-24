import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getVendorBySlug } from "@/lib/vendors-db";
import { getUpcomingSessionsForVendorSlug } from "@/lib/bookings-db";
import { VendorBookForm, type SerializableSession } from "./VendorBookForm";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function VendorBookPage({ params }: PageProps) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor || !vendor.acceptsBookings) {
    notFound();
  }

  const bookingData = await getUpcomingSessionsForVendorSlug(slug);
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
          <VendorBookForm vendorSlug={slug} vendorName={vendor.name} sessions={sessions} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
