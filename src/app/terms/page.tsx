import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { pageMetadata } from "@/lib/seo";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site-url";

export const metadata = pageMetadata({
  title: "Terms of Service",
  description:
    "Terms of Service for CarryClass (CarryClass LLC) — California's CCW classes directory, including SMS messaging terms.",
  path: "/terms",
});

const SITE_HOST = SITE_URL.replace("https://", "");

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-28 sm:px-6 sm:pt-32">
        <h1 className="text-3xl font-bold text-zinc-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Effective date: September 22, 2026 · Last updated: September 22, 2026
        </p>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Agreement</h2>
          <p>
            These Terms of Service (&quot;Terms&quot;) govern your use of{" "}
            <a
              href={SITE_URL}
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              {SITE_HOST}
            </a>{" "}
            (the &quot;Site&quot; or &quot;App&quot;) operated by{" "}
            <strong>CarryClass LLC</strong> (&quot;CarryClass,&quot;
            &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing or
            using the Site, you agree to these Terms and our{" "}
            <Link
              href="/privacy"
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Use of Site</h2>
          <p>
            CarryClass provides an informational directory of California CCW training
            providers and related tools for instructors and students. By using this
            Site, you agree to use it lawfully and responsibly.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">
            Google Calendar Connection
          </h2>
          <p>
            Instructors may optionally connect a Google account so CarryClass can
            read calendar information and sync class availability. By connecting
            Google, you authorize CarryClass LLC to access Google Calendar data as
            described in our{" "}
            <Link
              href="/privacy"
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              Privacy Policy
            </Link>
            , solely to provide and improve scheduling and booking features. You may
            disconnect Google at any time by choosing a different calendar option,
            revoking access in your Google Account settings, or contacting us to
            request removal of stored Google credentials.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">
            SMS and Text Messaging Terms
          </h2>
          <p>
            By choosing to receive text messages from CarryClass — for example, by
            selecting phone verification when claiming a listing at{" "}
            <Link
              href="/instructors/claim"
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              /instructors/claim
            </Link>{" "}
            — you agree to receive SMS messages at the mobile number on file for your
            listing or account.
          </p>
          <p>
            <strong>Message types:</strong> Text messages are transactional and
            service-related. They may include one-time verification codes, account
            notifications, booking confirmations, class reminders, and similar service
            updates.
          </p>
          <p>
            <strong>Message frequency:</strong> Message frequency varies. You may
            receive one or more messages when you request verification or when
            service-related events occur (such as a booking). We do not send recurring
            promotional SMS campaigns unless you separately opt in.
          </p>
          <p>
            <strong>Message and data rates may apply.</strong> Carriers are not liable
            for delayed or undelivered messages.
          </p>
          <p>
            <strong>Opt out:</strong> You can stop receiving text messages at any time
            by replying <strong>STOP</strong> to any CarryClass message. Reply{" "}
            <strong>HELP</strong> for help. After opting out, you may still use the
            Site using other verification methods where available.
          </p>
          <p>
            Consent to receive text messages is not required as a condition of
            purchasing any goods or services. You represent that you are the owner or
            authorized user of the mobile number you use for verification.
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
            Bookings and Payments
          </h2>
          <p>
            When booking or paying for a class through the Site, you enter into a
            transaction with the applicable instructor or provider. CarryClass LLC may
            facilitate scheduling and payment processing but is not the training
            provider unless stated otherwise.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">
            Limitation of Liability
          </h2>
          <p>
            To the maximum extent allowed by law, CarryClass LLC is not liable for any
            indirect, incidental, special, consequential, or punitive damages, or for
            losses arising from your use of the Site, reliance on directory listings,
            calendar sync issues, or SMS delivery failures beyond our reasonable
            control.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Changes</h2>
          <p>
            We may update these Terms from time to time. Continued use of the Site
            after updates means you accept the revised Terms. The current Terms are
            always available at{" "}
            <Link
              href="/terms"
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              {SITE_HOST}/terms
            </Link>
            .
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Contact</h2>
          <p>
            CarryClass is operated by <strong>CarryClass LLC</strong>. Questions about
            these Terms can be sent to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
