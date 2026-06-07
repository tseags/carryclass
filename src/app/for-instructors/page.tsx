import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "For CCW Instructors",
  description:
    "List your CCW classes on CarryClass. Reach students searching by county, manage your profile, accept online bookings, and grow your training business across California.",
  path: "/for-instructors",
});

const BENEFITS = [
  {
    title: "Get found by county",
    description:
      "Students search by county, class type, and format. Your listing appears where they are already looking for sheriff-approved CCW training.",
  },
  {
    title: "Accept bookings online",
    description:
      "Connect Stripe to let students book and pay for class sessions directly from your profile. You keep your class fee; we charge a 5% platform service fee per booking.",
  },
  {
    title: "Build trust with reviews",
    description:
      "Show pricing, class details, and student reviews in one place so prospects can compare options and choose your class with confidence.",
  },
] as const;

const STEPS = [
  {
    step: "1",
    title: "Claim your listing",
    description:
      "Find your existing profile or request a new one. We match your account to the right instructor listing across California counties.",
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
      "Listing in the CarryClass directory is free. When you enable online booking through Stripe Connect, a 5% platform service fee applies to each completed booking.",
  },
  {
    question: "What if I am already listed?",
    answer:
      "Search for your business on CarryClass, then claim your listing so we can link your instructor account to the correct profile and give you edit access.",
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

export default function ForInstructorsPage() {
  return (
    <>
      <Header />
      <main className="bg-neutral-200">
        <section className="section">
          <div className="container-default w-container">
            <div className="top-section-card home">
              <div className="inner-container _588px _100-tablet">
                <p className="text-200 bold color-secondary-2 mg-bottom-12px">
                  For CCW instructors
                </p>
                <h1 className="mg-bottom-12px">
                  Reach more students. Fill more classes.
                </h1>
                <p className="mg-bottom-24px">
                  CarryClass is California&apos;s CCW class directory. List your training
                  business, show up in county searches, and optionally accept bookings
                  online — so students find you when they are ready to train.
                </p>
                <div className="buttons-row">
                  <Link
                    href="/instructors/claim"
                    className="btn-primary button-row w-button"
                  >
                    Claim your listing
                  </Link>
                  <Link
                    href="/sign-up?intent=vendor"
                    className="btn-secondary w-button"
                  >
                    Create instructor account
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container-default w-container">
            <div className="text-center mg-bottom-32px">
              <div className="inner-container _588px center">
                <h2 className="mg-bottom-12px">Why instructors use CarryClass</h2>
                <p className="mg-bottom-0">
                  A focused directory built for CCW training — not a generic business
                  listing. Show up where students compare classes, prices, and reviews.
                </p>
              </div>
            </div>
            <div className="grid-3-columns top-section-link-cards-grid">
              {BENEFITS.map((benefit) => (
                <div key={benefit.title} className="card pd-44px---20px">
                  <h3 className="heading-h4-size mg-bottom-8px">{benefit.title}</h3>
                  <p className="color-neutral-600 mg-bottom-0">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container-default w-container">
            <div className="text-center mg-bottom-32px">
              <div className="inner-container _458px center">
                <h2 className="mg-bottom-12px">How it works</h2>
                <p className="mg-bottom-0">
                  Get listed in a few steps. Add booking and payments when you are ready
                  to take enrollments online.
                </p>
              </div>
            </div>
            <div className="grid-3-columns gap-row-32px">
              {STEPS.map((item) => (
                <div key={item.step} className="card pd-44px---20px">
                  <div className="text-200 bold color-secondary-2 mg-bottom-12px">
                    Step {item.step}
                  </div>
                  <h3 className="heading-h4-size mg-bottom-8px">{item.title}</h3>
                  <p className="color-neutral-600 mg-bottom-0">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container-default w-container">
            <div className="top-section-card v2">
              <div className="inner-container _588px center text-center">
                <h2 className="color-neutral-100 mg-bottom-12px">
                  Ready to claim your spot?
                </h2>
                <p className="color-neutral-300 mg-bottom-24px">
                  Join instructors across California who use CarryClass to reach students
                  searching for sheriff-approved CCW classes.
                </p>
                <div className="buttons-row center">
                  <Link href="/instructors/claim" className="btn-primary w-button">
                    Get started
                  </Link>
                  <Link
                    href="mailto:matthiasseager@gmail.com"
                    className="btn-secondary w-button"
                  >
                    Contact us
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container-default w-container">
            <div className="text-center mg-bottom-32px">
              <div className="inner-container _588px center">
                <h2 className="mg-bottom-12px">Instructor FAQs</h2>
                <p className="mg-bottom-0">
                  Common questions about listing, claiming, and booking on CarryClass.
                </p>
              </div>
            </div>
            <div className="inner-container _824px center">
              <div className="grid-1-column gap-row-24px">
                {FAQS.map((faq) => (
                  <div key={faq.question} className="card pd-44px---20px">
                    <h3 className="heading-h5-size mg-bottom-8px">{faq.question}</h3>
                    <p className="color-neutral-600 mg-bottom-0">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
