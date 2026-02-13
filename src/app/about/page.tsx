import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "About | CCW Courses",
  description: "Learn about CCW Courses — your directory for CCW training in California.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-zinc-900">About</h1>
        <p className="mt-4 text-zinc-600">
          CCW Courses helps you find approved CCW training and renewal courses
          across California. Browse by county, compare instructors, and get your
          permit.
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
