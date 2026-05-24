import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getVendorBySlug } from "@/lib/vendors-db";
import { BookingSuccessClient } from "./BookingSuccessClient";

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

export default async function BookingSuccessPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { session_id: sessionId } = await searchParams;
  const vendor = await getVendorBySlug(slug);
  if (!vendor || !vendor.acceptsBookings) notFound();

  if (!sessionId || !sessionId.startsWith("cs_")) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
          <p className="text-zinc-700">Missing checkout session. Start a new booking again.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-lg px-4 pb-16 pt-[calc(var(--header-offset)+1.5rem)] sm:px-6">
        <h1 className="text-2xl font-bold text-zinc-900">Booking confirmed</h1>
        <div className="mt-8">
          <BookingSuccessClient slug={slug} sessionId={sessionId} />
        </div>
      </main>
      <Footer />
    </div>
  );
}
