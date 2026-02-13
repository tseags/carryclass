import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "FAQs | CCW Courses",
  description: "Frequently asked questions about CCW training in California.",
};

export default function FAQsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-zinc-900">FAQs</h1>
        <p className="mt-2 text-zinc-600">
          Frequently asked questions about CCW training. Coming soon.
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
