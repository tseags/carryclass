import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AnimatedStatsGrid, type AnimatedStat } from "@/components/AnimatedStatsGrid";
import { pageMetadata } from "@/lib/seo";
import { CONTACT_EMAIL } from "@/lib/site-url";

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
      "Connect Stripe and let students book and pay directly from your profile after you claim your existing listing. Students pay a separate 5% platform fee at checkout on top of your class price — so you keep 100% of what you charge.",
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
    title: "Claim your listing",
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
    title: "Start accepting students",
    description:
      "Publish class sessions and connect Stripe when you are ready. Students can book from your profile while you manage everything from your dashboard.",
  },
] as const;

const FAQS = [
  {
    question: "Is it free to list my classes?",
    answer:
      "Listing in the CarryClass directory is free. When you enable online booking through Stripe Connect, students pay a separate 5% platform service fee at checkout on top of your class price — so you keep 100% of what you charge.",
  },
  {
    question: "Why should I claim my profile?",
    answer:
      "Claiming your profile allows you to add more information and accept online bookings directly on getcarryclass.com. Plus, get a free dashboard to send automatic confirmation, reminder, and follow-up emails; see real-time registrations; and one place to update your profile, pricing, and class details.",
  },
  {
    question: "How do you verify that I own the listing?",
    answer:
      "We send a one-time code to the email or phone already stored on your listing (from the sheriff-approved vendor data). You cannot enter a different contact to claim someone else’s page.",
  },
  {
    question: "Do I need Stripe to get started?",
    answer:
      "No. You can claim and update your listing without Stripe. Online booking is optional and available once you complete Stripe Connect onboarding.",
  },
  {
    question: "Which counties do you cover?",
    answer:
      "CarryClass covers sheriff-approved CCW instructors across California. Students browse by county, so multi-county instructors can appear in every market they serve.",
  },
] as const;

const STATS: AnimatedStat[] = [
  { number: "100%", label: "Of your class fee you keep" },
  { number: "5%", label: "Platform fee paid by students" },
  { number: "$0", label: "Cost to list your classes" },
  { number: "5 minutes", label: "To set up profile and accept bookings" },
];

function BenefitIcon({ type }: { type: (typeof BENEFITS)[number]["icon"] }) {
  const strokeProps = {
    stroke: "#c96442",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  } as const;

  const svgProps = {
    width: 22,
    height: 22,
    viewBox: "0 0 22 22",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
  } as const;

  if (type === "booking") {
    return (
      <svg {...svgProps}>
        <rect x="3.5" y="5" width="15" height="13" rx="2.5" {...strokeProps} />
        <path d="M3.5 9.5h15" {...strokeProps} />
        <path d="M7.5 3.5v3M14.5 3.5v3" {...strokeProps} />
        <path d="M8 13.5l2 2 4-4" {...strokeProps} />
      </svg>
    );
  }

  if (type === "dashboard") {
    return (
      <svg {...svgProps}>
        <rect x="3.5" y="4" width="7" height="5.5" rx="1.5" {...strokeProps} />
        <rect x="11.5" y="4" width="7" height="5.5" rx="1.5" {...strokeProps} />
        <rect x="3.5" y="12.5" width="15" height="5.5" rx="1.5" {...strokeProps} />
      </svg>
    );
  }

  return (
    <svg {...svgProps}>
      <circle cx="9.5" cy="9.5" r="5.5" {...strokeProps} />
      <path d="M13.5 13.5L18 18" {...strokeProps} />
    </svg>
  );
}

export default function ForInstructorsPage() {
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
                  business, show up in county searches, and accept bookings online.
                </p>
                <div className="buttons-row for-instructors-hero__buttons">
                  <Link href="/instructors/claim" className="btn-primary w-button">
                    Claim your listing
                  </Link>
                  <Link href="/instructors" className="btn-secondary w-button">
                    View all instructors
                  </Link>
                </div>
                <p className="for-instructors-hero__note">
                  Free to list · Verified with the contact already on your listing
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Why instructors use CarryClass */}
        <section
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
                  Online booking, a free instructor dashboard, and statewide visibility
                  — built for CCW training, not a generic business listing.
                </p>
              </div>
              <div className="for-instructors-section-header__btn">
                <Link
                  href="/instructors"
                  className="btn-secondary w-button popular-vendors-redesign__view-all"
                >
                  See example listings
                </Link>
              </div>
            </div>
            <div className="for-instructors-card-grid">
              {BENEFITS.map((benefit) => (
                <article key={benefit.title} className="for-instructors-card">
                  <div className="for-instructors-card__icon-wrap" aria-hidden="true">
                    <BenefitIcon type={benefit.icon} />
                  </div>
                  <h3 className="for-instructors-card__title">{benefit.title}</h3>
                  <p className="for-instructors-card__copy">{benefit.description}</p>
                </article>
              ))}
            </div>
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
                  <span className="for-instructors-heading__accent">Three steps</span> to a
                  live listing
                </h2>
                <p className="for-instructors-section-sub">
                  Get listed in a few steps. Add booking and payments when you are ready to
                  take enrollments online.
                </p>
              </div>
            </div>
            <ol className="for-instructors-card-grid">
              {STEPS.map((item) => (
                <li key={item.step} className="for-instructors-card for-instructors-step">
                  <div className="for-instructors-step__number" aria-hidden="true">
                    {item.step}
                  </div>
                  <h3 className="for-instructors-card__title">{item.title}</h3>
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
                  CarryClass indexes sheriff-approved CCW instructors statewide. Claiming
                  your page puts you in front of students comparing classes right now.
                </p>
                <ul className="by-the-numbers__bullets">
                  <li>
                    <span className="by-the-numbers__bullet-dot" aria-hidden="true" />
                    Free directory listing, no subscription
                  </li>
                  <li>
                    <span className="by-the-numbers__bullet-dot" aria-hidden="true" />
                    Appear in every county you serve
                  </li>
                  <li>
                    <span className="by-the-numbers__bullet-dot" aria-hidden="true" />
                    Online booking only when you want it
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
