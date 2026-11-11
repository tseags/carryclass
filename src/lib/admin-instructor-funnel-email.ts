/**
 * Ops alert when an instructor claims a listing or finishes onboarding publish.
 * Best-effort: callers should not fail the funnel if this throws.
 */
import { Resend } from "resend";
import { DEFAULT_FROM_EMAIL } from "@/lib/email-from";
import { publicEmailAppUrl } from "@/lib/email-templates-defaults";

const DEFAULT_ADMIN_NOTIFY_EMAIL = "ty@getcarryclass.com";

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

export function adminNotifyEmail(): string {
  return (
    process.env.ADMIN_NOTIFY_EMAIL?.trim() || DEFAULT_ADMIN_NOTIFY_EMAIL
  ).toLowerCase();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type InstructorFunnelEvent = "claimed" | "published";

export async function sendAdminInstructorFunnelEmail(input: {
  event: InstructorFunnelEvent;
  listingName: string;
  listingSlug: string;
  instructorEmail?: string | null;
  instructorPhone?: string | null;
  county?: string | null;
  clerkUserId?: string | null;
  channel?: string | null;
}): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    console.warn(
      "[admin-instructor-funnel] RESEND_API_KEY unset — skip admin notification"
    );
    return false;
  }

  const to = adminNotifyEmail();
  const base = publicEmailAppUrl();
  const listingUrl = `${base}/instructors/${encodeURIComponent(input.listingSlug)}`;
  const eventLabel =
    input.event === "claimed" ? "claimed their listing" : "published their profile";
  const subject =
    input.event === "claimed"
      ? `Instructor claimed: ${input.listingName}`
      : `Instructor published: ${input.listingName}`;

  const lines = [
    `An instructor just ${eventLabel} on CarryClass.`,
    "",
    `Listing: ${input.listingName}`,
    `Slug: ${input.listingSlug}`,
    `Profile: ${listingUrl}`,
    input.instructorEmail ? `Email: ${input.instructorEmail}` : null,
    input.instructorPhone ? `Phone: ${input.instructorPhone}` : null,
    input.county ? `County: ${input.county}` : null,
    input.channel ? `Claim channel: ${input.channel}` : null,
    input.clerkUserId ? `Clerk user: ${input.clerkUserId}` : null,
    "",
    "— CarryClass ops",
  ].filter((line): line is string => line != null);

  const detailRows = [
    ["Listing", input.listingName],
    ["Slug", input.listingSlug],
    ["Profile", listingUrl],
    input.instructorEmail ? ["Email", input.instructorEmail] : null,
    input.instructorPhone ? ["Phone", input.instructorPhone] : null,
    input.county ? ["County", input.county] : null,
    input.channel ? ["Claim channel", input.channel] : null,
    input.clerkUserId ? ["Clerk user", input.clerkUserId] : null,
  ].filter((row): row is [string, string] => row != null);

  const htmlRows = detailRows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#71717a;vertical-align:top;">${escapeHtml(label)}</td><td style="padding:4px 0;">${
          label === "Profile"
            ? `<a href="${escapeHtml(value)}">${escapeHtml(value)}</a>`
            : escapeHtml(value)
        }</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:520px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:28px 24px;">
          <tr>
            <td style="font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:#71717a;padding-bottom:8px;">CarryClass ops</td>
          </tr>
          <tr>
            <td style="font-size:20px;font-weight:700;padding-bottom:12px;">Instructor ${escapeHtml(eventLabel)}</td>
          </tr>
          <tr>
            <td style="font-size:15px;line-height:1.5;padding-bottom:16px;">
              <strong>${escapeHtml(input.listingName)}</strong> just ${escapeHtml(eventLabel)}.
            </td>
          </tr>
          <tr>
            <td>
              <table role="presentation" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.5;">
                ${htmlRows}
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: `CarryClass <${DEFAULT_FROM_EMAIL}>`,
      to,
      subject,
      text: lines.join("\n"),
      html,
    });
    if (error) {
      console.error("[admin-instructor-funnel] Resend error", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[admin-instructor-funnel] send failed", err);
    return false;
  }
}
