import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Blog | CarryClass – CCW Class Tips & California Guides",
  description: "CCW class guides, California permit tips, and training articles from CarryClass.",
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h1 className="text-3xl font-bold text-zinc-900">Blog</h1>
        <p className="mt-2 text-zinc-600">
          CCW articles, guides, and tips. Coming soon.
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
