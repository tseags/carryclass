import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { getVendorProfile, recordEmailEvent } from "@/lib/onboarding-db";
import { resolveFromAddress } from "@/lib/email-from";

export const runtime = "nodejs";

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

/** Fill merge tags with representative sample data for the preview send. */
function applySampleMergeTags(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vendor = await getVendorProfile(userId);
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  let payload: { subject?: string; body?: string; to?: string; fromEmail?: string; type?: string };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  const subject = (payload.subject ?? "").trim();
  const body = (payload.body ?? "").trim();
  if (!subject || !body) {
    return NextResponse.json(
      { error: "Subject and body are required to send a test." },
      { status: 400 }
    );
  }

  // Prefer an explicit recipient, then the instructor's profile email, then Clerk.
  const user = await currentUser();
  const clerkEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  const recipient = (payload.to ?? vendor.email ?? clerkEmail ?? "").trim();
  if (!recipient) {
    return NextResponse.json(
      { error: "No email address on file to send the test to." },
      { status: 400 }
    );
  }

  const sample: Record<string, string> = {
    student_name: "Jordan Sample",
    class_type: "16-Hour Initial CCW",
    class_date: "Saturday, July 12",
    class_time: "9:00 AM",
    instructor_name: vendor.name ?? user?.firstName ?? "Your Instructor",
    location: vendor.address ?? "Your range",
    rebooking_link: "https://getcarryclass.com",
  };

  const filledSubject = applySampleMergeTags(subject, sample);
  const filledBody = applySampleMergeTags(body, sample);

  // Resolve a deliverable sender: use the chosen/profile address only if it's on
  // our verified domain, otherwise fall back to the default and set reply-to.
  const { from, replyTo } = resolveFromAddress(
    payload.fromEmail ?? null,
    vendor.email ?? clerkEmail
  );

  let resendId: string | null = null;
  try {
    const { data } = await getResend().emails.send({
      from,
      to: recipient,
      replyTo: replyTo,
      subject: `[Test] ${filledSubject}`,
      text: filledBody,
    });
    resendId = data?.id ?? null;
  } catch (error) {
    console.error("[api/dashboard/test-email]", error);
    await recordEmailEvent({
      vendorId: vendor.id,
      templateType: payload.type ?? null,
      recipient,
      subject: filledSubject,
      status: "failed",
      isTest: true,
    });
    return NextResponse.json(
      { error: "Unable to send the test email right now. Please try again shortly." },
      { status: 502 }
    );
  }

  await recordEmailEvent({
    vendorId: vendor.id,
    templateType: payload.type ?? null,
    recipient,
    subject: filledSubject,
    status: "sent",
    isTest: true,
    resendId,
  });

  return NextResponse.json({ ok: true, sentTo: recipient });
}
