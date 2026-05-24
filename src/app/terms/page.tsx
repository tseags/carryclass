import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Terms of Service",
  description: "Terms of Service for CarryClass — California's CCW classes directory.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-28 sm:px-6 sm:pt-32">
        <h1 className="text-3xl font-bold text-zinc-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-zinc-500">Effective date: May 2, 2026</p>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Use of Site</h2>
          <p>
            CarryClass provides an informational directory of California CCW
            training providers. By using this site, you agree to use it lawfully and
            responsibly.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">
            Listings and Accuracy
          </h2>
          <p>
            Provider profiles, pricing, schedules, and other listing details may be
            supplied by third parties and can change without notice. We do not
            guarantee the completeness, reliability, or accuracy of listing content.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">
            No On-Site Booking or Payments
          </h2>
          <p>
            We do not currently provide direct on-site booking or payment processing.
            Any enrollment, booking, purchase, or payment is handled directly between
            you and the applicable third-party provider.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">
            Limitation of Liability
          </h2>
          <p>
            To the maximum extent allowed by law, CarryClass is not liable for any
            indirect, incidental, special, consequential, or punitive damages, or for
            losses arising from your use of the site or reliance on directory
            listings.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Changes</h2>
          <p>
            We may update these Terms of Service from time to time. Continued use of
            the site after updates means you accept the revised terms.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Contact</h2>
          <p>
            Questions about these terms can be sent to{" "}
            <a
              href="mailto:matthiasseager@gmail.com"
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              matthiasseager@gmail.com
            </a>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
