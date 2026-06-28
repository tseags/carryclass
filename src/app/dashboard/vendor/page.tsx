import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { VENDOR_ROLE } from "@/lib/auth/roles";
import {
  getVendorProfile,
  getCalendarClasses,
  getClassTypes,
  getEmailTemplates,
  type VendorEmailTemplate,
} from "@/lib/onboarding-db";
import {
  getDashboardReviews,
  getDashboardRegistrations,
  getDashboardStats,
  getDashboardPayout,
  getEmailMetrics,
} from "@/lib/dashboard-db";
import { VendorDashboard } from "@/components/dashboard/VendorDashboard";

export default async function VendorDashboardPage() {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?intent=vendor");
  }

  const user = await currentUser();
  if (!user || user.publicMetadata.role !== VENDOR_ROLE) {
    redirect("/dashboard");
  }

  const vendor = await getVendorProfile(userId);
  if (!vendor?.is_published) {
    redirect("/onboard");
  }

  const now = new Date();

  const [allClasses, classTypes, templates, reviews, registrations, stats, payout, emailMetrics] =
    await Promise.all([
      getCalendarClasses(vendor.id),
      getClassTypes(vendor.id),
      getEmailTemplates(vendor.id),
      getDashboardReviews(vendor.slug),
      getDashboardRegistrations(vendor.slug),
      getDashboardStats(vendor.slug),
      getDashboardPayout(vendor.stripe_account_id),
      getEmailMetrics(vendor.id),
    ]);

  const upcomingClasses = allClasses.filter((c) => new Date(c.start_time) > now);

  const templateMap = Object.fromEntries(
    templates.map((t) => [t.type, t])
  ) as Record<string, Partial<VendorEmailTemplate>>;

  const firstName = user.firstName ?? vendor.name ?? "there";
  const publicProfileUrl = vendor.slug ? `/instructors/${vendor.slug}` : null;

  return (
    <>
      <Header />
      <VendorDashboard
        vendor={vendor}
        firstName={firstName}
        classes={upcomingClasses}
        classTypes={classTypes}
        registrations={registrations}
        reviews={reviews}
        templates={templateMap}
        stats={stats}
        payout={payout}
        emailMetrics={emailMetrics}
        publicProfileUrl={publicProfileUrl}
      />
    </>
  );
}
