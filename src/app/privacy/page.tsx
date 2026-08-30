import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { pageMetadata } from "@/lib/seo";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site-url";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "Privacy Policy for CarryClass — California's CCW classes directory, including SMS messaging practices.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-28 sm:px-6 sm:pt-32">
        <h1 className="text-3xl font-bold text-zinc-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">Effective date: August 30, 2026</p>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Overview</h2>
          <p>
            CarryClass (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates{" "}
            {SITE_URL.replace("https://", "")} (the &quot;Site&quot;), a directory
            to help users find California CCW training providers. This Privacy Policy
            explains what information we collect, how we use it, and your choices —
            including how we handle mobile phone numbers and text messages.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">
            Information We Collect
          </h2>
          <p>
            We may collect basic usage data (such as pages viewed, device and browser
            details, and approximate location from IP address) to operate and improve
            the Site. If you contact us, we collect the information you provide in your
            message.
          </p>
          <p>
            If you use account features, claim a listing, or book a class, we may
            collect your name, email address, phone number, and related account or
            transaction information you provide.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">
            SMS and Text Messaging
          </h2>
          <p>
            With your consent, CarryClass may send you text messages (SMS) to the
            mobile phone number associated with your listing or account. Messages are
            sent through our messaging provider, Twilio.
          </p>
          <p>
            <strong>How you opt in:</strong> You consent to receive text messages
            when you choose phone verification on the Site — for example, by clicking
            &quot;Text code&quot; on the{" "}
            <Link href="/instructors/claim" className="font-medium text-zinc-900 underline underline-offset-2">
              claim your listing
            </Link>{" "}
            page to receive a one-time verification code at the phone number already
            on file for your business. Consent is not a condition of purchase.
          </p>
          <p>
            <strong>Types of messages:</strong> Messages are transactional and
            service-related. They may include one-time verification codes, account
            notifications, booking confirmations, class reminders, and similar
            service updates. We do not send marketing or promotional text messages
            unless you separately opt in.
          </p>
          <p>
            <strong>Message frequency:</strong> Message frequency varies depending
            on your activity. You may receive one or more messages when you request
            phone verification, and occasional messages related to bookings or account
            activity. We do not send recurring promotional message campaigns.
          </p>
          <p>
            <strong>Message and data rates may apply.</strong> Carriers are not liable
            for delayed or undelivered messages.
          </p>
          <p>
            <strong>Opt out:</strong> Reply <strong>STOP</strong> to any CarryClass
            text message to unsubscribe from future text messages. You may also reply{" "}
            <strong>HELP</strong> for assistance. After you opt out, we may send one
            final message confirming your request. You can still use the Site; you may
            need to verify by email instead of SMS.
          </p>
          <p>
            <strong>Mobile number sharing:</strong> We do not sell, rent, or share
            your mobile phone number with third parties for their own marketing or
            promotional purposes. We may share your number only with service providers
            that help us deliver text messages (such as Twilio) and only as needed to
            provide the services you request.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">
            How We Use Information
          </h2>
          <p>
            We use information to run the directory, verify listing ownership,
            facilitate bookings, maintain site security, improve user experience, send
            service-related communications (including SMS where you have opted in),
            and respond to inquiries.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">
            Directory Listings and Third Parties
          </h2>
          <p>
            Listing details are provided by third parties and may change over time.
            We do not guarantee that all listing information is complete, current, or
            accurate.
          </p>
          <p>
            Enrollment, booking, or payment with an instructor may occur on or through
            the Site. When you book with a third-party instructor, that provider may
            have its own privacy practices.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Data Sharing</h2>
          <p>
            We do not sell personal information. We may share limited data with
            service providers that help host, secure, analyze, and operate the Site
            (including email and SMS delivery). These providers may use your
            information only to perform services on our behalf.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Your Rights</h2>
          <p>
            Depending on where you live, you may have rights to access, correct, or
            delete personal information we hold about you. California residents may
            have additional rights under the CCPA. To exercise these rights, contact
            us using the information below.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Changes</h2>
          <p>
            We may update this Privacy Policy from time to time. We will revise the
            effective date at the top of this page when we do. Continued use of the
            Site after changes means you accept the updated policy.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Contact</h2>
          <p>
            Questions about this Privacy Policy or our SMS practices can be sent to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
            . See also our{" "}
            <Link href="/terms" className="font-medium text-zinc-900 underline underline-offset-2">
              Terms of Service
            </Link>
            .
          </p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
