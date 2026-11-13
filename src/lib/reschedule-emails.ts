/**
 * Reschedule invite + confirmation emails (hardcoded HTML, Resend).
 */
import { Resend } from "resend";
import { DEFAULT_FROM_EMAIL, resolveFromAddress } from "@/lib/email-from";
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
import type { RescheduleBookingSummary, RescheduleSessionSummary } from "@/lib/reschedule-booking";

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

function sessionDateLabel(session: RescheduleSessionSummary): string {
  const tz = session.timezone || "America/Los_Angeles";
  return formatInTimezone(session.startsAt, tz, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function sessionTimeLabel(session: RescheduleSessionSummary): string {
  const tz = session.timezone || "America/Los_Angeles";
  return formatInTimezone(session.startsAt, tz, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function firstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0];
  return first || "there";
}

export function rescheduleMagicLinkUrl(rawToken: string): string {
  return `${publicEmailAppUrl()}/reschedule/${encodeURIComponent(rawToken)}`;
}

export async function sendRescheduleInviteEmail(input: {
  booking: RescheduleBookingSummary;
  rawToken: string;
  expiresAt: Date;
}): Promise<boolean> {
  const recipient = input.booking.customerEmail.trim().toLowerCase();
  if (!recipient) return false;

  const resend = getResend();
  if (!resend) {
    console.warn("[reschedule-emails] RESEND_API_KEY unset — skip invite");
    return false;
  }

  const profile = await getVendorProfileBySlug(input.booking.vendorSlug);
  const companyName =
    input.booking.vendorName?.trim() || profile?.name?.trim() || "Your instructor";
  const instructorEmail =
    profile?.email?.trim() || "your instructor";
  const current = input.booking.currentSession;
  const classLabel = classTypeLabel(current.classType, current.title);
  const classDate = sessionDateLabel(current);
  const classTime = sessionTimeLabel(current);
  const link = rescheduleMagicLinkUrl(input.rawToken);
  const student = firstName(input.booking.customerName);
  const expiresLabel = formatInTimezone(input.expiresAt, "America/Los_Angeles", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const subject = `Reschedule your ${classLabel} with ${companyName}`;
  const text = [
    `Hi ${student},`,
    "",
    `${companyName} invited you to pick a different class time on CarryClass.`,
    "",
    `Current class: ${classLabel}`,
    `${classDate} · ${classTime}`,
    "",
    `Choose a new time: ${link}`,
    "",
    `This link expires ${expiresLabel}.`,
    "",
    `Questions? Reply to this email or contact ${instructorEmail}.`,
    "",
    carryClassEmailSignatureText(),
  ].join("\n");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111827;">
      <p>Hi ${escapeHtml(student)},</p>
      <p><strong>${escapeHtml(companyName)}</strong> invited you to pick a different class time on CarryClass. Your payment stays the same — you’re just moving to another open session.</p>
      <p style="margin-bottom:4px;"><strong>Current class</strong></p>
      <ul style="margin:0 0 16px;padding-left:20px;">
        <li>${escapeHtml(classLabel)}</li>
        <li>${escapeHtml(classDate)} · ${escapeHtml(classTime)}</li>
      </ul>
      <p style="margin:24px 0;">
        <a href="${escapeHtml(link)}" style="display:inline-block;background:#C1440E;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:600;">
          Choose a new class time
        </a>
      </p>
      <p style="font-size:13px;color:#6b7280;">This link expires ${escapeHtml(expiresLabel)}.</p>
      <p style="font-size:13px;color:#6b7280;">Questions? Reply to this email or contact ${escapeHtml(instructorEmail)}.</p>
      ${carryClassEmailSignatureHtml()}
    </div>
  `.trim();

  const { from, replyTo } = resolveFromAddress(null, profile?.email);
  const fromHeader =
    from === DEFAULT_FROM_EMAIL ? `CarryClass <${DEFAULT_FROM_EMAIL}>` : from;
  const eventVendorId = profile?.id ?? null;

  try {
    const { data, error } = await resend.emails.send({
      from: fromHeader,
      to: recipient,
      replyTo,
      subject,
      text,
      html,
    });
    if (error) throw new Error(error.message || "Resend send failed");
    if (eventVendorId) {
      await recordEmailEvent({
        vendorId: eventVendorId,
        templateType: "reschedule_invite",
        recipient,
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
        templateType: "reschedule_invite",
        recipient,
        subject,
        status: "failed",
        isTest: false,
      });
    }
    throw err;
  }

  return true;
}

export async function sendRescheduleConfirmationEmails(input: {
  booking: RescheduleBookingSummary;
  previousSession: RescheduleSessionSummary;
  newSession: RescheduleSessionSummary;
}): Promise<{ student: boolean; instructor: boolean }> {
  const resend = getResend();
  if (!resend) {
    console.warn("[reschedule-emails] RESEND_API_KEY unset — skip confirmation");
    return { student: false, instructor: false };
  }

  const profile = await getVendorProfileBySlug(input.booking.vendorSlug);
  const companyName =
    input.booking.vendorName?.trim() || profile?.name?.trim() || "Your instructor";
  const classLabel = classTypeLabel(input.newSession.classType, input.newSession.title);
  const newDate = sessionDateLabel(input.newSession);
  const newTime = sessionTimeLabel(input.newSession);
  const oldDate = sessionDateLabel(input.previousSession);
  const oldTime = sessionTimeLabel(input.previousSession);
  const confirmation = input.booking.confirmationCode?.trim() || "—";
  const studentName = input.booking.customerName.trim() || "Student";
  const studentEmail = input.booking.customerEmail.trim().toLowerCase();
  const dashboardUrl = `${publicEmailAppUrl()}/dashboard/vendor`;

  const studentSubject = `You’re rescheduled: ${classLabel} on ${newDate}`;
  const studentText = [
    `Hi ${firstName(studentName)},`,
    "",
    `Your class with ${companyName} has been moved.`,
    "",
    `New time: ${newDate} · ${newTime}`,
    `Previously: ${oldDate} · ${oldTime}`,
    `Confirmation #: ${confirmation}`,
    "",
    carryClassEmailSignatureText(),
  ].join("\n");

  const studentHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111827;">
      <p>Hi ${escapeHtml(firstName(studentName))},</p>
      <p>Your class with <strong>${escapeHtml(companyName)}</strong> has been moved. No extra payment was charged.</p>
      <p style="margin-bottom:4px;"><strong>New class time</strong></p>
      <ul style="margin:0 0 16px;padding-left:20px;">
        <li>${escapeHtml(classLabel)}</li>
        <li>${escapeHtml(newDate)} · ${escapeHtml(newTime)}</li>
      </ul>
      <p style="margin-bottom:4px;"><strong>Previously</strong></p>
      <ul style="margin:0 0 16px;padding-left:20px;">
        <li>${escapeHtml(oldDate)} · ${escapeHtml(oldTime)}</li>
      </ul>
      <p><strong>Confirmation #</strong> ${escapeHtml(confirmation)}</p>
      ${carryClassEmailSignatureHtml()}
    </div>
  `.trim();

  const instructorRecipients = resolveBookingNotificationRecipients({
    enabled: profile?.booking_notification_enabled,
    notificationEmails: profile?.booking_notification_emails,
    profileEmail: profile?.email,
    listingEmail: null,
  });
  // Always try to notify someone on reschedule even if new-booking prefs are off.
  const instructorTo =
    instructorRecipients.length > 0
      ? instructorRecipients
      : [profile?.email?.trim().toLowerCase()].filter(Boolean) as string[];

  const instructorSubject = `Rescheduled: ${studentName} → ${newDate}`;
  const instructorText = [
    `${studentName} picked a new class time on CarryClass.`,
    "",
    `Student: ${studentName}`,
    `Email: ${studentEmail || "—"}`,
    "",
    `New time: ${classLabel} — ${newDate} · ${newTime}`,
    `Previously: ${oldDate} · ${oldTime}`,
    `Confirmation #: ${confirmation}`,
    "",
    `View registrations: ${dashboardUrl}`,
    "",
    carryClassEmailSignatureText(),
  ].join("\n");

  const instructorHtml = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.5;color:#111827;">
      <p><strong>${escapeHtml(studentName)}</strong> picked a new class time on CarryClass.</p>
      <p style="margin-bottom:4px;"><strong>Student</strong></p>
      <ul style="margin:0 0 16px;padding-left:20px;">
        <li>${escapeHtml(studentName)}</li>
        ${studentEmail ? `<li><a href="mailto:${escapeHtml(studentEmail)}">${escapeHtml(studentEmail)}</a></li>` : ""}
      </ul>
      <p style="margin-bottom:4px;"><strong>New class time</strong></p>
      <ul style="margin:0 0 16px;padding-left:20px;">
        <li>${escapeHtml(classLabel)}</li>
        <li>${escapeHtml(newDate)} · ${escapeHtml(newTime)}</li>
      </ul>
      <p style="margin-bottom:4px;"><strong>Previously</strong></p>
      <ul style="margin:0 0 16px;padding-left:20px;">
        <li>${escapeHtml(oldDate)} · ${escapeHtml(oldTime)}</li>
      </ul>
      <p><strong>Confirmation #</strong> ${escapeHtml(confirmation)}</p>
      <p><a href="${escapeHtml(dashboardUrl)}">View registrations in your dashboard</a></p>
      ${carryClassEmailSignatureHtml()}
    </div>
  `.trim();

  const { from, replyTo } = resolveFromAddress(null, profile?.email);
  const fromHeader =
    from === DEFAULT_FROM_EMAIL ? `CarryClass <${DEFAULT_FROM_EMAIL}>` : from;
  const eventVendorId = profile?.id ?? null;

  let studentOk = false;
  let instructorOk = false;

  if (studentEmail) {
    try {
      const { data, error } = await resend.emails.send({
        from: fromHeader,
        to: studentEmail,
        replyTo,
        subject: studentSubject,
        text: studentText,
        html: studentHtml,
      });
      if (error) throw new Error(error.message || "Resend send failed");
      studentOk = true;
      if (eventVendorId) {
        await recordEmailEvent({
          vendorId: eventVendorId,
          templateType: "reschedule_confirmation_student",
          recipient: studentEmail,
          subject: studentSubject,
          status: "sent",
          isTest: false,
          resendId: data?.id ?? null,
        });
      }
    } catch (err) {
      console.error("[reschedule-emails] student confirmation failed", err);
      if (eventVendorId) {
        await recordEmailEvent({
          vendorId: eventVendorId,
          templateType: "reschedule_confirmation_student",
          recipient: studentEmail,
          subject: studentSubject,
          status: "failed",
          isTest: false,
        });
      }
    }
  }

  if (instructorTo.length > 0) {
    try {
      const { data, error } = await resend.emails.send({
        from: `CarryClass <${DEFAULT_FROM_EMAIL}>`,
        to: instructorTo,
        subject: instructorSubject,
        text: instructorText,
        html: instructorHtml,
      });
      if (error) throw new Error(error.message || "Resend send failed");
      instructorOk = true;
      if (eventVendorId) {
        await recordEmailEvent({
          vendorId: eventVendorId,
          templateType: "reschedule_confirmation_instructor",
          recipient: instructorTo.join(", "),
          subject: instructorSubject,
          status: "sent",
          isTest: false,
          resendId: data?.id ?? null,
        });
      }
    } catch (err) {
      console.error("[reschedule-emails] instructor confirmation failed", err);
      if (eventVendorId) {
        await recordEmailEvent({
          vendorId: eventVendorId,
          templateType: "reschedule_confirmation_instructor",
          recipient: instructorTo.join(", "),
          subject: instructorSubject,
          status: "failed",
          isTest: false,
        });
      }
    }
  }

  return { student: studentOk, instructor: instructorOk };
}
