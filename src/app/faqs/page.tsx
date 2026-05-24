import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "CCW FAQs | California CCW Requirements & Renewal",
  description:
    "Answers to common questions about how to get a CCW in California, CCW requirements, renewal training, and finding approved classes near you.",
};

export default function FAQsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-zinc-900">California CCW FAQs</h1>
        <p className="mt-2 text-zinc-600">
          Common questions about CCW requirements, how to get a CCW permit in California, renewal training, and finding classes near you. Coming soon.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block text-sm font-medium text-zinc-600 hover:text-zinc-900"
        >
          ← Back to Home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
