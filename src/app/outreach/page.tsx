import { currentUser } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { OutreachDashboard } from "@/components/outreach/OutreachDashboard";
import { getOutreachUserId } from "@/lib/outreach/auth";
import { listOutreachContacts } from "@/lib/outreach/contacts";
import { voiceMissingEnv } from "@/lib/outreach/twilio-voice";
import { zohoMissingEnv } from "@/lib/outreach/zoho";

export const dynamic = "force-dynamic";

export default async function OutreachPage() {
  const userId = await getOutreachUserId();
  if (!userId) notFound();

  const [user, contacts] = await Promise.all([currentUser(), listOutreachContacts()]);

  return (
    <>
      <Header />
      <OutreachDashboard
        initialContacts={contacts}
        firstName={user?.firstName ?? "Ty"}
        imageUrl={user?.imageUrl ?? null}
        voiceMissing={voiceMissingEnv()}
        zohoMissing={zohoMissingEnv()}
        callerId={process.env.TWILIO_FROM_NUMBER?.trim() || null}
      />
    </>
  );
}
