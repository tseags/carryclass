import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { RescheduleClient } from "./RescheduleClient";

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata = {
  title: "Reschedule your class | CarryClass",
  robots: { index: false, follow: false },
};

export default async function ReschedulePage({ params }: PageProps) {
  const { token } = await params;
  const rawToken = decodeURIComponent(token ?? "").trim();

  return (
    <div className="flex min-h-screen flex-col bg-[#faf9f6]">
      <Header />
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-10 sm:px-6 sm:py-14">
        {rawToken ? (
          <RescheduleClient token={rawToken} />
        ) : (
          <div className="rounded-[14px] border border-[rgba(17,24,39,0.12)] bg-white p-6">
            <h1 className="!m-0 !text-2xl !font-semibold !text-[#141413]">Link unavailable</h1>
            <p className="!mt-2 !mb-0 text-sm text-[#5C554C]">
              This reschedule link is invalid. Ask your instructor to send a new one.
            </p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
