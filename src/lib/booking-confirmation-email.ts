/**
 * Send the student booking-confirmation email after Checkout succeeds.
 * Best-effort: callers should not fail the booking webhook if this throws.
 */
import { clerkClient } from "@clerk/nextjs/server";
import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { resolveFromAddress, DEFAULT_FROM_EMAIL } from "@/lib/email-from";
import {
  applyMergeTags,
  emailBodyToHtml,
  emailBodyToPlainText,
  resolveTemplateContent,
} from "@/lib/email-templates-defaults";
import {
  getEmailTemplates,
  getVendorProfileBySlug,
  recordEmailEvent,
} from "@/lib/onboarding-db";

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function classTypeLabel(classType: string, title: string | null): string {
  if (title?.trim()) return title.trim();
  if (classType === "initial") return "16-Hour Initial CCW";
  if (classType === "renewal") return "8-Hour Renewal";
  return classType;
}

function formatInTimezone(
  date: Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions
): string {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone, ...options }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-US", options).format(date);
  }
}

function firstNameFrom(fullName: string, explicit?: string): string {
  const given = explicit?.trim();
  if (given) return given;
  const first = fullName.trim().split(/\s+/)[0];
  return first || "there";
}

/** Person's name when the instructor account has one; otherwise the company. */
async function signatureName(
  clerkUserId: string | null | undefined,
  companyName: string
): Promise<string> {
  const company = companyName.trim() || "Your instructor";
  const userId = clerkUserId?.trim();
  if (!userId) return company;
  try {
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const person = [user.firstName, user.lastName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ");
    if (person) return person;
  } catch (err) {
    console.warn("[booking-confirmation-email] instructor name lookup failed", err);
  }
  return company;
}

export async function sendBookingConfirmationEmail(input: {
  prismaVendorId: string;
  classSessionId: string;
  customerName: string;
  customerFirstName?: string;
  customerEmail: string;
}): Promise<void> {
  const recipient = input.customerEmail.trim().toLowerCase();
  if (!recipient) {
    console.warn("[booking-confirmation-email] missing recipient — skip");
    return;
  }

  const resend = getResend();
  if (!resend) {
    console.warn(
      "[booking-confirmation-email] RESEND_API_KEY unset — skip confirmation email"
    );
    return;
  }

  const session = await prisma.classSession.findUnique({
    where: { id: input.classSessionId },
    include: { vendor: true },
  });
  if (!session || session.vendorId !== input.prismaVendorId) {
    console.warn("[booking-confirmation-email] session/vendor mismatch — skip", {
      classSessionId: input.classSessionId,
      prismaVendorId: input.prismaVendorId,
    });
    return;
  }

  const bookingVendor = session.vendor;
  const profile = await getVendorProfileBySlug(bookingVendor.slug);
  const templates = profile ? await getEmailTemplates(profile.id) : [];
  const saved = templates.find((t) => t.type === "confirmation");
  const { subject, body } = resolveTemplateContent("confirmation", saved);

  const tz = session.timezone || "America/Los_Angeles";
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://www.getcarryclass.com";
  const companyName =
    bookingVendor.name?.trim() || profile?.name?.trim() || "Your instructor";
  const instructorName = await signatureName(profile?.clerk_user_id, companyName);
  const instructorEmail =
    profile?.email?.trim() ||
    bookingVendor.email?.trim() ||
    "your instructor";
  const location =
    profile?.address?.trim() ||
    bookingVendor.address?.trim() ||
    "See your instructor for location details";
  const studentName = input.customerName.trim() || "there";

  const values: Record<string, string> = {
    first_name: firstNameFrom(studentName, input.customerFirstName),
    student_name: studentName,
    class_type: classTypeLabel(session.classType, session.title),
    class_date: formatInTimezone(session.startsAt, tz, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    class_time: formatInTimezone(session.startsAt, tz, {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }),
    company_name: companyName,
    instructor_name: instructorName,
    instructor_email: instructorEmail,
    location,
    what_to_bring_link: `${baseUrl}/instructors/${bookingVendor.slug}?tab=what-to-bring`,
    rebooking_link: `${baseUrl}/instructors/${bookingVendor.slug}/book`,
  };

  const filledSubject = applyMergeTags(subject, values);
  const filledBody = applyMergeTags(body, values);
  const text = emailBodyToPlainText(filledBody);
  const html = emailBodyToHtml(filledBody);

  const { from, replyTo } = resolveFromAddress(
    saved?.from_email,
    profile?.email ?? bookingVendor.email
  );
  const fromHeader =
    from === DEFAULT_FROM_EMAIL ? `CarryClass <${DEFAULT_FROM_EMAIL}>` : from;

  // Log against onboarding vendor when present (dashboard email metrics);
  // otherwise skip event row — Prisma vendor id is not the same table.
  const eventVendorId = profile?.id ?? null;

  try {
    const { data, error } = await resend.emails.send({
      from: fromHeader,
      to: recipient,
      replyTo: replyTo,
      subject: filledSubject,
      text,
      html,
    });
    if (error) {
      throw new Error(error.message || "Resend send failed");
    }
    if (eventVendorId) {
      await recordEmailEvent({
        vendorId: eventVendorId,
        templateType: "confirmation",
        recipient,
        subject: filledSubject,
        status: "sent",
        isTest: false,
        resendId: data?.id ?? null,
      });
    }
  } catch (err) {
    if (eventVendorId) {
      await recordEmailEvent({
        vendorId: eventVendorId,
        templateType: "confirmation",
        recipient,
        subject: filledSubject,
        status: "failed",
        isTest: false,
      });
    }
    throw err;
  }
}
