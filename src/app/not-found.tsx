import Link from "next/link";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main className="mx-auto max-w-4xl px-4 py-16 text-center sm:py-24">
        <h1 className="text-2xl font-bold text-zinc-900 sm:text-3xl">
          Page not found
        </h1>
        <p className="mt-2 text-zinc-600">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Go home
        </Link>
      </main>
    </div>
  );
}
