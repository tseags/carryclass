import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  getVendorProfile,
  getEmailTemplates,
  getClassTypes,
  upsertEmailTemplate,
} from "@/lib/onboarding-db";
import { VENDOR_ROLE } from "@/lib/auth/roles";
import { currentUser } from "@clerk/nextjs/server";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { EmailSettingsClient } from "./EmailSettingsClient";

export default async function DashboardEmailsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?intent=vendor");

  const user = await currentUser();
  if (!user || user.publicMetadata.role !== VENDOR_ROLE) {
    redirect("/dashboard");
  }

  const vendor = await getVendorProfile(userId);
  if (!vendor) redirect("/onboard");

  const [templates, classTypes] = await Promise.all([
    getEmailTemplates(vendor.id),
    getClassTypes(vendor.id),
  ]);

  const activeClassTypes = classTypes
    .filter((ct) => ct.is_active)
    .map((ct) => ct.class_type);

  const templateMap = Object.fromEntries(templates.map((t) => [t.type, t]));

  return (
    <>
      <Header />
      <main className="bg-zinc-50/40 min-h-screen">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-zinc-900">Email settings</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Customize the emails your students receive before and after class.
              Emails send from <span className="font-mono">bookings@getcarryclass.com</span>.
            </p>
          </div>
          <EmailSettingsClient
            vendorId={vendor.id}
            vendorName={vendor.name ?? ""}
            activeClassTypes={activeClassTypes}
            initialTemplates={templateMap}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
