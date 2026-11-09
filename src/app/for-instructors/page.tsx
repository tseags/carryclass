import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnimatedStatsGrid, type AnimatedStat } from "@/components/AnimatedStatsGrid";
import { BenefitsShowcase } from "@/components/for-instructors/BenefitsShowcase";
import { VENDOR_ROLE } from "@/lib/auth/roles";
import { getVendorProfile } from "@/lib/onboarding-db";
import { pageMetadata } from "@/lib/seo";
import { CONTACT_EMAIL } from "@/lib/site-url";
import { PLATFORM_SERVICE_FEE_PERCENT_LABEL } from "@/lib/booking-constants";

export const metadata = pageMetadata({
  title: "For CCW Instructors",
  description:
    "List your CCW classes on CarryClass. Reach students searching by county, manage your profile, accept online bookings, and grow your training business across California.",
  path: "/for-instructors",
});

const BENEFITS = [
  {
    title: "Accept bookings online",
    description:
      `Claiming and updating your profile is free, and connecting Stripe is optional. Connecting Stripe allows students to book and pay from your profile. They pay a separate ${PLATFORM_SERVICE_FEE_PERCENT_LABEL} platform fee at checkout on top of your class price, so you keep 100% of what you charge.`,
    icon: "booking",
  },
  {
    title: "Free instructor dashboard",
    description:
      "Run your classes from one free backend: automatic confirmation, reminder, and follow-up emails; real-time registrations; and one place to update your profile, pricing, and class details.",
    icon: "dashboard",
  },
  {
    title: "Get more visibility",
    description:
      "CarryClass reaches thousands of high-intent students browsing CCW classes across California who are ready to book. Your listing appears where they compare instructors by county, price, and reviews.",
    icon: "visibility",
  },
] as const;

const STEPS = [
  {
    step: "1",
    title: "Verify your profile",
    description:
      "Find your existing sheriff-approved page and verify with the email or phone already on that listing. We do not create duplicate listings.",
  },
  {
    step: "2",
    title: "Complete your profile",
    description:
      "Add class types, pricing, photos, and what students should bring. Accurate details help you rank in county searches and convert more inquiries.",
  },
  {
    step: "3",
    title: "Publish and access your dashboard",
    description:
      "Publish your listing and schedule with or without Stripe. Connect Stripe whenever you are ready and online booking turns on from that point forward.",
  },
] as const;

const FAQS = [
  {
    question: "Is it free to list my classes?",
    answer:
      `Yes, listing classes on CarryClass is free. The ${PLATFORM_SERVICE_FEE_PERCENT_LABEL} transaction fee applies to online bookings, paid by students at checkout on top of your class price. Instructors keep 100% of the class fee.`,
  },
  {
    question: "Why should I claim my profile?",
    answer:
      "Claiming your profile lets you add more information, and — if you connect Stripe — accept online bookings directly on getcarryclass.com. Plus, get a free dashboard to send automatic confirmation, reminder, and follow-up emails; see real-time registrations; and one place to update your profile, pricing, and class details.",
  },
  {
    question: "How do you verify that I own the listing?",
    answer:
      "We send a one-time code to the email or phone already stored on your listing (from the sheriff-approved vendor data). You cannot enter a different contact to claim someone else’s page.",
  },
  {
    question: "Do I need Stripe to get started?",
    answer:
      "No. You can claim your listing, finish every onboarding step, publish, and keep editing your page without Stripe — you can skip the payments step entirely. Online booking and payments are the one thing that requires Stripe Connect: until you connect, your profile shows your details and schedule but students cannot book or pay through CarryClass. Connect from your dashboard any time and booking turns on.",
  },
  {
    question: "Which counties do you cover?",
    answer:
      "CarryClass covers sheriff-approved CCW instructors across California. Students browse by county, so multi-county instructors can appear in every market they serve.",
  },
] as const;

const STATS: AnimatedStat[] = [
  { number: "100%", label: "Of your class fee you keep" },
  { number: PLATFORM_SERVICE_FEE_PERCENT_LABEL, label: "Transaction fee paid by students" },
  { number: "$0", label: "Cost to list your classes" },
  { number: "5 minutes", label: "To verify and complete your profile" },
];

type PageProps = {
  searchParams: Promise<{ benefit?: string }>;
};

export default async function ForInstructorsPage({ searchParams }: PageProps) {
  const user = await currentUser();
  const isInstructor = user?.publicMetadata?.role === VENDOR_ROLE;
  const vendor = isInstructor && user ? await getVendorProfile(user.id) : null;
  const hasCompletedOnboarding = Boolean(vendor?.is_published && vendor.slug);
  const primaryCtaHref =
    hasCompletedOnboarding && vendor
      ? `/instructors/${vendor.slug}`
      : "/instructors/claim";
  const primaryCtaLabel = hasCompletedOnboarding ? "View Profile" : "Create Profile";
  const benefitSlug = (await searchParams).benefit?.toLowerCase();
  const initialBenefitIndex = BENEFITS.findIndex((b) => b.icon === benefitSlug);

  return (
    <>
      <Header />
      <main className="home-page-sections for-instructors-page">
        {/* Hero */}
        <div className="section-2">
          <div className="container-default home w-container">
            <div className="top-section-card home for-instructors-hero--centered">
              <div className="for-instructors-hero__inner">
                <div className="for-instructors-eyebrow">For CCW instructors</div>
                <h1 className="for-instructors-hero__title">
                  List CCW classes for free.
                  <span className="for-instructors-hero__title-line">
                    Get more visibility and online bookings.
                  </span>
                </h1>
                <p className="for-instructors-hero__sub">
                  CarryClass is California&apos;s CCW class directory. Claim your training
                  business, show up in county searches, and add online bookings when you want them.
                </p>
                <div className="buttons-row for-instructors-hero__buttons">
                  <Link href={primaryCtaHref} className="btn-primary w-button">
                    {primaryCtaLabel}
                  </Link>
                  <Link href="/instructors" className="btn-secondary w-button">
                    View all instructors
                  </Link>
                </div>
                {!hasCompletedOnboarding ? (
                  <p className="for-instructors-hero__note">
                    Free to list. Verify and create your profile in under 5 minutes
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Why instructors use CarryClass */}
        <section
          id="for-instructors-benefits"
          className="for-instructors-benefits"
          aria-labelledby="for-instructors-benefits-heading"
        >
          <div className="container-default w-container">
            <div className="for-instructors-section-header">
              <div className="for-instructors-section-header__copy">
                <div className="for-instructors-eyebrow">Why CarryClass</div>
                <h2 id="for-instructors-benefits-heading" className="for-instructors-heading">
                  <span className="for-instructors-heading__accent">Why instructors use</span>{" "}
                  CarryClass
                </h2>
                <p className="for-instructors-section-sub">
                  Optional online booking, a free instructor dashboard, and statewide visibility
                  — built for CCW training, not a generic business listing.
                </p>
              </div>
            </div>
            <BenefitsShowcase
              benefits={BENEFITS}
              initialIndex={initialBenefitIndex >= 0 ? initialBenefitIndex : 0}
            />
          </div>
        </section>

        {/* How it works */}
        <section
          className="for-instructors-steps"
          aria-labelledby="for-instructors-steps-heading"
        >
          <div className="container-default w-container">
            <div className="for-instructors-section-header">
              <div className="for-instructors-section-header__copy">
                <div className="for-instructors-eyebrow">How it works</div>
                <h2 id="for-instructors-steps-heading" className="for-instructors-heading">
                  <span className="for-instructors-heading__accent">Three steps</span> to list
                  classes
                </h2>
                <p className="for-instructors-section-sub">
                  Complete your profile in a few short steps. Connect your calendar and
                  accounts to start accepting online bookings.
                </p>
              </div>
            </div>
            <ol className="for-instructors-card-grid">
              {STEPS.map((item) => (
                <li key={item.step} className="for-instructors-card for-instructors-step">
                  <div className="for-instructors-step__head">
                    <div className="for-instructors-step__number" aria-hidden="true">
                      {item.step}
                    </div>
                    <h3 className="for-instructors-card__title">{item.title}</h3>
                  </div>
                  <p className="for-instructors-card__copy">{item.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Directory scope */}
        <section className="by-the-numbers" aria-labelledby="for-instructors-stats-heading">
          <div className="container-default w-container">
            <div className="by-the-numbers__inner">
              <div className="by-the-numbers__copy">
                <div className="by-the-numbers__eyebrow">Where your listing lives</div>
                <h2 id="for-instructors-stats-heading" className="by-the-numbers__heading">
                  Students are already
                  <br />
                  searching your county.
                </h2>
                <p className="by-the-numbers__body">
                  CarryClass indexes sheriff-approved CCW instructors statewide. Verifying
                  your profile puts you in front of students comparing classes right now.
                </p>
                <ul className="by-the-numbers__bullets">
                  <li>
                    <span className="by-the-numbers__bullet-dot" aria-hidden="true" />
                    Free profile with no subscription
                  </li>
                  <li>
                    <span className="by-the-numbers__bullet-dot" aria-hidden="true" />
                    Appear in every county you serve
                  </li>
                  <li>
                    <span className="by-the-numbers__bullet-dot" aria-hidden="true" />
                    Online booking fully automated
                  </li>
                </ul>
              </div>
              <AnimatedStatsGrid stats={STATS} />
            </div>
          </div>
        </section>

        {/* FAQs */}
        <section className="for-instructors-faq" aria-labelledby="for-instructors-faq-heading">
          <div className="container-default w-container">
            <div className="for-instructors-section-header">
              <div className="for-instructors-section-header__copy">
                <div className="for-instructors-eyebrow">Instructor FAQs</div>
                <h2 id="for-instructors-faq-heading" className="for-instructors-heading">
                  <span className="for-instructors-heading__accent">Questions</span> before
                  you claim
                </h2>
                <p className="for-instructors-section-sub">
                  Common questions about listing, claiming, and booking on CarryClass.
                </p>
              </div>
            </div>
            <div className="for-instructors-faq__list">
              {FAQS.map((faq) => (
                <details key={faq.question} className="for-instructors-faq__item">
                  <summary className="for-instructors-faq__summary">
                    <h3 className="for-instructors-faq__question">{faq.question}</h3>
                    <span className="for-instructors-faq__chevron" aria-hidden="true" />
                  </summary>
                  <p className="for-instructors-faq__answer">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="for-instructors-cta" aria-labelledby="for-instructors-cta-heading">
          <div className="for-instructors-cta__inner">
            <div className="for-instructors-cta__row">
              <div className="for-instructors-cta__copy">
                <h2 id="for-instructors-cta-heading" className="for-instructors-cta__heading">
                  Ready to claim your spot?
                </h2>
                <p className="for-instructors-cta__body">
                  Join instructors across California who use CarryClass to reach students
                  searching for sheriff-approved CCW classes.
                </p>
              </div>
              <div className="buttons-row for-instructors-cta__buttons">
                <Link href="/instructors/claim" className="btn-primary w-button">
                  Get started
                </Link>
                <Link
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="btn-secondary w-button"
                >
                  Contact us
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
