import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { getVendorProfile, recordEmailEvent } from "@/lib/onboarding-db";
import { resolveFromAddress } from "@/lib/email-from";
import {
  applyMergeTags,
  emailBodyToHtml,
  emailBodyToPlainText,
} from "@/lib/email-templates-defaults";

export const runtime = "nodejs";

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
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

  const companyName = vendor.name ?? "Your company";
  const personName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || companyName;
  const listingSlug = vendor.slug?.trim();
  const profileUrl = listingSlug
    ? `https://www.getcarryclass.com/instructors/${listingSlug}`
    : "https://www.getcarryclass.com";
  const sample: Record<string, string> = {
    first_name: "Jordan",
    student_name: "Jordan Sample",
    class_type: "CCW Initial: Day 1",
    class_date: "Saturday, October 10, 2026",
    class_time: "9:00 AM PDT",
    company_name: companyName,
    instructor_name: personName,
    instructor_email: vendor.email ?? clerkEmail ?? "instructor@example.com",
    location: vendor.address ?? "Your range",
    what_to_bring_link: `${profileUrl}?tab=what-to-bring`,
    rebooking_link: listingSlug ? `${profileUrl}/book` : profileUrl,
  };

  const filledSubject = applyMergeTags(subject, sample);
  const filledBody = applyMergeTags(body, sample);
  const text = emailBodyToPlainText(filledBody);
  const html = emailBodyToHtml(filledBody);

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
      text,
      html,
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
