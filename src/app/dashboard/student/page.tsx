import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SavedListingsSection } from "@/components/SavedListingsSection";
import { getCurrentUserSavedListingsPage } from "@/lib/saved-vendors";
import { STUDENT_ROLE } from "@/lib/auth/roles";

export default async function StudentDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?intent=student");
  }

  const user = await currentUser();
  if (!user || user.publicMetadata.role !== STUDENT_ROLE) {
    redirect("/dashboard");
  }

  const firstName = user.firstName ?? "there";
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const rawSavedPage = resolvedSearchParams?.savedPage;
  const parsedSavedPage = Number(Array.isArray(rawSavedPage) ? rawSavedPage[0] : rawSavedPage);
  const savedPage = Number.isFinite(parsedSavedPage) && parsedSavedPage > 0 ? parsedSavedPage : 1;
  const savedListingsPage = await getCurrentUserSavedListingsPage(savedPage, 12);

  return (
    <>
      <Header />
      <main className="bg-zinc-50/40">
        <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-12 md:px-12 md:py-14 lg:px-16 lg:py-16 xl:px-20 xl:py-18">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
              Welcome back, {firstName}
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Save and compare CCW courses, keep track of renewals, and follow instructors you like.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <SavedListingsSection
              initialItems={savedListingsPage.items}
              totalCount={savedListingsPage.totalCount}
              page={savedListingsPage.page}
              totalPages={savedListingsPage.totalPages}
            />
            <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-zinc-800">
                County & renewal reminders
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                When you add your county and permit dates, we&apos;ll help you keep track of renewal timelines.
              </p>
            </section>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

