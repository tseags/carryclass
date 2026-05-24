import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VENDOR_ROLE } from "@/lib/auth/roles";

export default async function VendorDashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?intent=vendor");
  }

  const user = await currentUser();
  if (!user || user.publicMetadata.role !== VENDOR_ROLE) {
    redirect("/dashboard");
  }

  const firstName = user.firstName ?? "there";

  return (
    <>
      <Header />
      <main className="bg-zinc-50/40">
        <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12 md:px-12 md:py-14 lg:px-16 lg:py-16 xl:px-20 xl:py-18">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
              Hi {firstName}, manage your CCW listing
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Update your class details, counties served, and pricing so students can find the right training for them.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-800">
                Claimed listings
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Listing management will live here. For now, reach out if you need your class details updated.
              </p>
            </section>
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-800">
                Upcoming classes
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                In the future, you&apos;ll be able to highlight upcoming sessions and track student interest.
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

