import type { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getBookingConfirmation } from "@/lib/booking-confirmation";
import { BookingSuccessClient } from "./BookingSuccessClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking confirmation | CarryClass",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ session_id?: string }>;
}

function MissingBooking({ slug, message }: { slug: string; message: string }) {
  return (
    <div className="mx-auto max-w-lg py-10 text-center">
      <h1 className="text-2xl font-bold text-zinc-900">We couldn&apos;t find that booking</h1>
      <p className="mt-3 text-zinc-600">{message}</p>
      <Link
        href={`/instructors/${slug}/book`}
        className="btn-primary bg-secondary-2 small w-button mt-8 inline-block"
      >
        Start a new booking
      </Link>
    </div>
  );
}

export default async function BookingSuccessPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const { session_id: sessionId } = await searchParams;

  const confirmation =
    sessionId?.startsWith("cs_") ? await getBookingConfirmation(sessionId) : null;
  if (confirmation && sessionId && confirmation.vendorSlug !== slug) {
    permanentRedirect(
      `/instructors/${confirmation.vendorSlug}/book/success?session_id=${encodeURIComponent(sessionId)}`
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-20 pt-[calc(var(--header-offset)+2rem)] sm:px-6">
        {!sessionId || !sessionId.startsWith("cs_") ? (
          <MissingBooking
            slug={slug}
            message="This link is missing its checkout reference. If you were charged, check your email for your confirmation."
          />
        ) : !confirmation ? (
          <MissingBooking
            slug={slug}
            message="We couldn't match this checkout to a class. If you were charged, check your email for your confirmation or contact the instructor."
          />
        ) : (
          <BookingSuccessClient sessionId={sessionId} initial={confirmation} />
        )}
      </main>
      <Footer />
    </div>
  );
}
