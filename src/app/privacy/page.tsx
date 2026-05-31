import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Privacy Policy",
  description: "Privacy Policy for CarryClass — California's CCW classes directory.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-12 pt-28 sm:px-6 sm:pt-32">
        <h1 className="text-3xl font-bold text-zinc-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">Effective date: May 2, 2026</p>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Overview</h2>
          <p>
            Carry Class is a directory to help users find California CCW training
            providers. This policy explains what information we collect and how we
            use it.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">
            Information We Collect
          </h2>
          <p>
            We may collect basic usage data (such as pages viewed, device/browser
            details, and approximate location from IP) to operate and improve the
            site. If you contact us, we collect the information you provide in your
            message.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">
            How We Use Information
          </h2>
          <p>
            We use information to run the directory, maintain site security, improve
            user experience, and respond to inquiries.
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
            We do not currently provide direct on-site booking or payment processing.
            Any enrollment, booking, or payment occurs outside this site with the
            applicable provider.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Data Sharing</h2>
          <p>
            We do not sell personal information. We may share limited data with
            service providers that help host, secure, and analyze the site.
          </p>
        </section>

        <section className="mt-8 space-y-3 text-zinc-700">
          <h2 className="text-xl font-semibold text-zinc-900">Contact</h2>
          <p>
            Questions about this Privacy Policy can be sent to{" "}
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
