import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { pageMetadata } from "@/lib/seo";
import { CONTACT_EMAIL, SITE_URL } from "@/lib/site-url";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "Privacy Policy for CarryClass (CarryClass LLC) — California's CCW classes directory, including Google user data and SMS practices.",
  path: "/privacy",
});

const SITE_HOST = SITE_URL.replace("https://", "");

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-28 sm:px-6 sm:pt-32">
        <h1 className="text-3xl font-bold text-zinc-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Effective date: September 22, 2026 · Last updated: September 22, 2026
        </p>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Overview</h2>
          <p>
            This Privacy Policy applies to the CarryClass application and website
            operated by <strong>CarryClass LLC</strong> (&quot;CarryClass,&quot;
            &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) at{" "}
            <a
              href={SITE_URL}
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              {SITE_HOST}
            </a>{" "}
            (the &quot;Site&quot; or &quot;App&quot;). CarryClass is California&apos;s
            directory for sheriff-approved CCW training providers and related
            booking tools for instructors and students.
          </p>
          <p>
            This policy explains what information we collect (including Google user
            data when you connect Google services), how we use, store, share, and
            protect it, how long we retain it, and how you can request deletion or
            exercise other rights. If we change how we use Google user data, we will
            update this Privacy Policy and revise the date above.
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
            collect personal data you provide, including your name, email address,
            phone number, and related account or transaction information.
          </p>
          <p>
            We may collect, or process on behalf of instructors and students, the
            following categories of personal data when you use or interact with
            CarryClass: account identifiers, contact details, listing and business
            profile information, booking and payment-related metadata (processed via
            our payment provider), calendar and scheduling data you choose to connect,
            and communications preferences.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">
            Google User Data
          </h2>
          <p>
            CarryClass offers an optional Google Calendar connection for instructors
            who want to sync class availability. When you choose to connect Google
            through our OAuth consent screen, we access Google user data only with
            your authorization and only as needed to provide that feature.
          </p>
          <p>
            <strong>What Google user data we access:</strong> With your consent, our
            application accesses Google Calendar data via the{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm">
              calendar.readonly
            </code>{" "}
            scope. This may include your Google Calendar list (calendar names and
            IDs), event titles, descriptions, locations, start and end times,
            attendee or availability-related fields exposed by the Calendar API, and
            OAuth tokens (access and refresh tokens) needed to keep the connection
            working. We do not request access to your Gmail, Google Drive, Contacts,
            or other Google Workspace data beyond Calendar as described here.
          </p>
          <p>
            <strong>How we use Google user data:</strong> We use Google Calendar data
            solely to provide and improve CarryClass functionality you request —
            specifically to display and sync class schedules, keep instructor
            availability up to date on the Site, and support booking-related features.
            We will not use Google user data for targeted advertising, personalized or
            interest-based ads, retargeting, selling to data brokers or information
            resellers, credit-worthiness or lending decisions, creating unrelated
            databases, or any purpose other than providing or improving
            user-facing CarryClass features.
          </p>
          <p>
            <strong>AI / machine learning:</strong> CarryClass does not use Google
            user data, Google Workspace APIs, or Google Calendar data to develop,
            improve, or train generalized or non-personalized artificial intelligence
            (AI) or machine learning (ML) models.
          </p>
          <p>
            <strong>Sharing, transfer, and disclosure of Google user data:</strong>{" "}
            We do not sell Google user data. We do not transfer or disclose Google
            user data to third parties for advertising, data brokerage, or any purpose
            other than providing or improving CarryClass. We may share limited Google
            Calendar–derived scheduling information as needed to operate bookings
            (for example, showing available class times to students) and with
            infrastructure service providers that host or secure our systems, solely
            to perform services on our behalf under contractual confidentiality and
            security obligations. We do not transfer Google user data to third parties
            for reasons other than providing or improving the application&apos;s
            functionality.
          </p>
          <p>
            <strong>Storage and protection of Google user data:</strong> OAuth refresh
            tokens and related calendar identifiers are stored in our secured
            databases. Security procedures are in place to protect the
            confidentiality of your data. We use encryption in transit (HTTPS/TLS)
            and industry-standard controls at our hosting and database providers to
            protect information. Access to Google credentials and calendar data is
            limited to systems and personnel needed to operate the Calendar sync
            feature.
          </p>
          <p>
            <strong>Retention and deletion of Google user data:</strong> We retain
            Google OAuth tokens and synced calendar-related data for as long as your
            Google Calendar connection remains active and as needed to provide the
            scheduling features you requested, unless a longer period is required or
            permitted by law. You may disconnect Google Calendar by switching to
            another calendar option during onboarding, by revoking CarryClass access
            in your Google Account permissions, or by requesting deletion of your
            Google user data (including stored tokens and calendar-derived scheduling
            data) by emailing{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
            . When the retention period ends or you successfully request deletion, we
            will delete or destroy the applicable Google user data, except where we
            must retain limited records to comply with law or resolve disputes.
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
            <Link
              href="/instructors/claim"
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
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
            We will use your data to provide you with the services you requested,
            including operating the directory, verifying listing ownership,
            facilitating bookings and payments, syncing instructor calendars,
            maintaining site security, improving user experience, sending
            service-related communications (including SMS where you have opted in),
            and responding to inquiries. We do not sell personal information.
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
            service providers that help host, secure, analyze, deliver email or SMS,
            process payments, and otherwise operate the Site (for example, hosting,
            authentication, payment, and messaging providers). These providers may
            use your information only to perform services on our behalf. We do not
            transfer or disclose your information to third parties for purposes other
            than those described in this Privacy Policy.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">
            Data Security
          </h2>
          <p>
            Security procedures are in place to protect the confidentiality of your
            data. We use encryption (HTTPS/TLS) to protect information transmitted
            between your browser and our servers, and we rely on reputable hosting
            and database providers with access controls and monitoring. No method of
            transmission or storage is completely secure; we work to protect your
            information using commercially reasonable safeguards.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">
            Data Retention and Deletion
          </h2>
          <p>
            We store your personal information for a period of time that is consistent
            with our business purposes. We will retain your personal information for
            the length of time needed to fulfill the purposes outlined in this Privacy
            Policy unless a longer retention period is required or permitted by law.
            When the data retention period expires for a given type of data, we will
            delete or destroy it, or de-identify it so it can no longer reasonably be
            associated with you.
          </p>
          <p>
            You may request that your data be deleted by contacting{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
            . We will respond to verified requests in accordance with applicable law.
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
            We may update this Privacy Policy from time to time, including if we
            change how CarryClass uses Google user data. We will revise the effective
            or &quot;last updated&quot; date at the top of this page when we do.
            Continued use of the Site after changes means you accept the updated
            policy. Material changes affecting Google user data will be reflected on
            this dedicated Privacy Policy page at{" "}
            <Link
              href="/privacy"
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              {SITE_HOST}/privacy
            </Link>
            .
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Contact</h2>
          <p>
            CarryClass is operated by <strong>CarryClass LLC</strong>. Questions about
            this Privacy Policy, Google user data, or our SMS practices can be sent
            to{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
              {CONTACT_EMAIL}
            </a>
            . See also our{" "}
            <Link
              href="/terms"
              className="font-medium text-zinc-900 underline underline-offset-2"
            >
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
