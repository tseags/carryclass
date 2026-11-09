/**
 * Notify the instructor when a student completes paid online booking.
 * Best-effort: callers should not fail student confirmation if this throws.
 */
import { Resend } from "resend";
import { prisma } from "@/lib/db";
import { DEFAULT_FROM_EMAIL } from "@/lib/email-from";
import {
  carryClassEmailSignatureHtml,
  carryClassEmailSignatureText,
} from "@/lib/email-signature";
import { publicEmailAppUrl } from "@/lib/email-templates-defaults";
import {
  getVendorProfileBySlug,
  recordEmailEvent,
} from "@/lib/onboarding-db";
import { resolveBookingNotificationRecipients } from "@/lib/booking-notification-prefs";

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

function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendInstructorBookingNotificationEmail(input: {
  bookingId: string;
}): Promise<boolean> {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: {
      vendor: true,
      classSession: true,
    },
  });
  if (!booking || booking.status !== "PAID") {
    console.warn("[instructor-booking-notification] booking missing or unpaid — skip", {
      bookingId: input.bookingId,
    });
    return false;
  }

  const profile = await getVendorProfileBySlug(booking.vendor.slug);
  const recipients = resolveBookingNotificationRecipients({
    enabled: profile?.booking_notification_enabled,
    notificationEmails: profile?.booking_notification_emails,
    profileEmail: profile?.email,
    listingEmail: booking.vendor.email,
  });
  if (!recipients.length) {
    console.warn("[instructor-booking-notification] no recipients — skip", {
      bookingId: booking.id,
      slug: booking.vendor.slug,
    });
    return false;
  }

  const resend = getResend();
  if (!resend) {
    console.warn(
      "[instructor-booking-notification] RESEND_API_KEY unset — skip instructor notification"
    );
    return false;
  }

  const session = booking.classSession;
  const tz = session.timezone || "America/Los_Angeles";
  const classLabel = classTypeLabel(session.classType, session.title);
  const classDate = formatInTimezone(session.startsAt, tz, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const classTime = formatInTimezone(session.startsAt, tz, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  const confirmation = booking.confirmationCode?.trim() || "—";
  const studentName = booking.customerName.trim() || "Student";
  const studentEmail = booking.customerEmail.trim() || "—";
  const studentPhone = booking.customerPhone?.trim() || "";
  const amount = formatUsd(booking.classAmountCents);
  const baseUrl = publicEmailAppUrl();
  const dashboardUrl = `${baseUrl}/dashboard/vendor`;
  const companyName =
    booking.vendor.name?.trim() || profile?.name?.trim() || "your listing";

  const subject = `New booking: ${studentName} — ${classLabel} on ${classDate}`;
  const text = [
    `You have a new booking on CarryClass.`,
    "",
    "Student:",
    `• ${studentName}`,
    `• ${studentEmail}`,
    studentPhone ? `• ${studentPhone}` : null,
    "",
    "Class:",
    `• ${classLabel}`,
    `• ${classDate} · ${classTime}`,
    "",
    `Confirmation #: ${confirmation}`,
    `Class amount: ${amount}`,
    "",
    `View registrations: ${dashboardUrl}`,
    "",
    carryClassEmailSignatureText(),
  ]
    .filter((line): line is string => line != null)
    .join("\n");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111827;">
      <p>You have a new booking on CarryClass for <strong>${escapeHtml(companyName)}</strong>.</p>
      <p style="margin-bottom:4px;"><strong>Student</strong></p>
      <ul style="margin:0 0 16px;padding-left:20px;">
        <li>${escapeHtml(studentName)}</li>
        <li><a href="mailto:${escapeHtml(studentEmail)}">${escapeHtml(studentEmail)}</a></li>
        ${studentPhone ? `<li>${escapeHtml(studentPhone)}</li>` : ""}
      </ul>
      <p style="margin-bottom:4px;"><strong>Class</strong></p>
      <ul style="margin:0 0 16px;padding-left:20px;">
        <li>${escapeHtml(classLabel)}</li>
        <li>${escapeHtml(classDate)} · ${escapeHtml(classTime)}</li>
      </ul>
      <p><strong>Confirmation #</strong> ${escapeHtml(confirmation)}<br/>
      <strong>Class amount</strong> ${escapeHtml(amount)}</p>
      <p><a href="${escapeHtml(dashboardUrl)}">View registrations in your dashboard</a></p>
      ${carryClassEmailSignatureHtml()}
    </div>
  `.trim();

  const eventVendorId = profile?.id ?? null;

  try {
    const { data, error } = await resend.emails.send({
      from: `CarryClass <${DEFAULT_FROM_EMAIL}>`,
      to: recipients,
      subject,
      text,
      html,
    });
    if (error) {
      throw new Error(error.message || "Resend send failed");
    }
    if (eventVendorId) {
      await recordEmailEvent({
        vendorId: eventVendorId,
        templateType: "instructor_booking",
        recipient: recipients.join(", "),
        subject,
        status: "sent",
        isTest: false,
        resendId: data?.id ?? null,
      });
    }
  } catch (err) {
    if (eventVendorId) {
      await recordEmailEvent({
        vendorId: eventVendorId,
        templateType: "instructor_booking",
        recipient: recipients.join(", "),
        subject,
        status: "failed",
        isTest: false,
      });
    }
    throw err;
  }

  return true;
}
