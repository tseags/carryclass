import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getVendorBySlug } from "@/lib/vendors-db";
import { getUpcomingSessionsForVendorSlug } from "@/lib/bookings-db";
import {
  PLATFORM_FEE_LINE_LABEL,
  applicableFeeSnapshots,
  bookClassPath,
  buildCheckoutAmounts,
  classesIndexPath,
  directoryCcwCards,
  formatCents,
} from "@/lib/instructor-catalog";
import { getOnboardingPublicCatalog } from "@/lib/public-instructor-classes";
import { pageMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ slug: string; classKey: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, classKey } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return {};
  return pageMetadata({
    title: `Class — ${vendor.name}`,
    description: `Class details and price for ${vendor.name}.`,
    path: `/instructors/${vendor.slug}/classes/${classKey}`,
  });
}

export default async function InstructorClassPage({ params }: PageProps) {
  const { slug, classKey } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) notFound();
  if (vendor.slug !== slug) {
    permanentRedirect(`/instructors/${vendor.slug}/classes/${classKey}`);
  }

  const catalog = await getOnboardingPublicCatalog(vendor.slug);
  const cards = catalog
    ? [...catalog.ccw, ...catalog.other]
    : directoryCcwCards(vendor);
  const card = cards.find((item) => item.key === classKey);
  if (!card) redirect(classesIndexPath(vendor.slug));

  const fees = catalog
    ? applicableFeeSnapshots(catalog.fees, card.key).map((fee) => {
        const rule = catalog.fees.find((item) => item.id === fee.id);
        return { ...fee, note: rule?.note ?? null };
      })
    : [];
  const amounts =
    card.priceCents != null
      ? buildCheckoutAmounts(
          card.priceCents,
          fees.map((fee) => ({ id: fee.id, name: fee.name, amountCents: fee.amountCents }))
        )
      : null;

  const booking = await getUpcomingSessionsForVendorSlug(vendor.slug).catch(() => null);
  const sessions = (booking?.sessions ?? []).filter((session) => session.classType === card.key);

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
          <Link href={classesIndexPath(vendor.slug)} className="hover:text-zinc-800">
            Classes
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-zinc-900">{card.title}</span>
        </nav>

        <h1 className="text-[28px] font-semibold leading-[1.15] tracking-[-0.02em] text-[#1f1f1d] sm:text-[40px]">
          {card.title}
        </h1>
        {card.subtitle ? (
          <p className="mt-3 max-w-2xl text-[16px] leading-[1.6] text-[#4f4e4a]">{card.subtitle}</p>
        ) : null}

        <section className="mt-8 rounded-[14px] border border-[#ebe9e2] bg-white p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-[#1f1f1d]">Price</h2>
          {amounts ? (
            <ul className="mt-4 space-y-2 text-sm text-[#3f3e3a]">
              <li className="flex justify-between gap-4">
                <span>Class price</span>
                <span className="font-medium tabular-nums">{formatCents(amounts.classTuitionCents)}</span>
              </li>
              {fees.map((fee) => (
                <li key={fee.id} className="flex justify-between gap-4">
                  <span>
                    {fee.name}
                    {fee.note ? (
                      <span className="mt-0.5 block text-xs text-[#77766f]">{fee.note}</span>
                    ) : null}
                  </span>
                  <span className="font-medium tabular-nums">{formatCents(fee.amountCents)}</span>
                </li>
              ))}
              <li className="flex justify-between gap-4">
                <span>{PLATFORM_FEE_LINE_LABEL}</span>
                <span className="font-medium tabular-nums">{formatCents(amounts.platformFeeCents)}</span>
              </li>
              <li className="flex justify-between gap-4 border-t border-[#ebe9e2] pt-2 text-base font-semibold text-[#1f1f1d]">
                <span>Total</span>
                <span className="tabular-nums">{formatCents(amounts.totalCents)}</span>
              </li>
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[#4f4e4a]">Call or email for the current price.</p>
          )}
          <Link
            href={bookClassPath(vendor.slug, card.key)}
            className="btn-primary mt-6 inline-block !bg-[#c96442] !text-white hover:!bg-[#d97757]"
          >
            Book this class
          </Link>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-[#1f1f1d]">Upcoming sessions</h2>
          {sessions.length === 0 ? (
            <p className="mt-3 text-sm text-[#4f4e4a]">No upcoming sessions for this class yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {sessions.map((session) => (
                <li
                  key={session.id}
                  className="rounded-[14px] border border-[#ebe9e2] bg-white px-4 py-3 text-sm text-[#1f1f1d]"
                >
                  <p className="font-medium">
                    {session.title ?? card.title}
                  </p>
                  <p className="mt-1 text-[#5e5d59]">
                    {new Intl.DateTimeFormat("en-US", {
                      timeZone: session.timezone || "America/Los_Angeles",
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(session.startsAt)}
                    {" · "}
                    {formatCents(session.priceCents)}
                    {" · "}
                    {session.spotsLeft} spot{session.spotsLeft === 1 ? "" : "s"} left
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
