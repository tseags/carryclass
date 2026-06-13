import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { VENDOR_ROLE } from "@/lib/auth/roles";
import { getVendorProfile } from "@/lib/onboarding-db";

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
  const vendor = await getVendorProfile(userId);

  // New instructor who hasn't published yet → send to onboarding
  if (!vendor?.is_published) {
    redirect("/onboard");
  }

  return (
    <>
      <Header />
      <main className="bg-zinc-50/40 min-h-screen">
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
                Your listing
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                {vendor?.name ?? "Your listing"} is live on CarryClass.
              </p>
              <div className="mt-3 flex gap-3">
                <Link
                  href="/onboard/step/1"
                  className="text-sm text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition-colors"
                >
                  Edit profile
                </Link>
              </div>
            </section>
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-800">
                Email settings
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Customize booking confirmations, reminders, and follow-up emails sent to students.
              </p>
              <div className="mt-3">
                <Link
                  href="/dashboard/emails"
                  className="text-sm text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition-colors"
                >
                  Manage email templates →
                </Link>
              </div>
            </section>
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-800">
                Class schedule
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Add, edit, or sync your class times.
              </p>
              <div className="mt-3">
                <Link
                  href="/onboard/step/3"
                  className="text-sm text-zinc-600 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50 transition-colors"
                >
                  Manage schedule →
                </Link>
              </div>
            </section>
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-800">
                Payments
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                {vendor?.stripe_account_id
                  ? "Stripe is connected. You're accepting paid bookings."
                  : "Connect Stripe to accept paid bookings from students."}
              </p>
              {!vendor?.stripe_account_id && (
                <div className="mt-3">
                  <Link
                    href="/onboard/step/5"
                    className="text-sm text-violet-600 border border-violet-200 rounded-lg px-3 py-1.5 hover:bg-violet-50 transition-colors"
                  >
                    Connect Stripe →
                  </Link>
                </div>
              )}
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

