/**
 * Generic, professional default email templates used when an instructor has not
 * written their own content yet. Keeps the dashboard cards and editor from ever
 * being empty, and gives a sensible starting point that already uses the merge
 * tags supported across the codebase.
 *
 * Safe to import from client components — no server-only dependencies.
 */

export type EmailTemplateType = "confirmation" | "reminder" | "followup";

/** Merge tags rendered at send-time from booking/class/vendor data. */
export const MERGE_TAGS = [
  "{first_name}",
  "{student_name}",
  "{class_type}",
  "{class_date}",
  "{class_time}",
  "{company_name}",
  "{instructor_name}",
  "{instructor_email}",
  "{location}",
  "{what_to_bring_link}",
  "{rebooking_link}",
] as const;

interface DefaultTemplate {
  subject: string;
  body: string;
}

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateType, DefaultTemplate> = {
  confirmation: {
    subject: "You're booked, {first_name} — {class_type} on {class_date}",
    body: `Hi {first_name},

Thanks for booking your {class_type} with {company_name}. Your spot is confirmed.

**Here are your class details:**
• Date: {class_date}
• Time: {class_time}
• Location: {location}

Please bring a valid photo ID and the following items listed [here]({what_to_bring_link}).

Please keep all firearms unloaded and leave all ammunition in your vehicle.

If you have any questions before class, you can respond directly to this email.

Thank you,
{instructor_name}`,
  },
  reminder: {
    subject: "Reminder: your {class_type} is on {class_date}",
    body: `Hi {student_name},

This is a friendly reminder about your upcoming {class_type} with {instructor_name}.

• Date: {class_date}
• Time: {class_time}
• Location: {location}

Please arrive a few minutes early and bring a valid photo ID. If anything has come up and you need to make a change, reply to this email and we'll help.

Looking forward to seeing you,
{instructor_name}`,
  },
  followup: {
    subject: "Thanks for training with {instructor_name}",
    body: `Hi {student_name},

Thank you for attending the {class_type} on {class_date}. It was a pleasure having you in class.

If you found the training valuable, we'd really appreciate a quick review — it helps other students find us.

Ready for your next step? You can book another class here: {rebooking_link}

Stay safe,
{instructor_name}`,
  },
};

/**
 * Confirmation copy from before the class-details rewrite. Instructors who
 * saved that generic default (without editing it) should pick up the new one.
 */
const LEGACY_CONFIRMATION: DefaultTemplate = {
  subject: "You're booked, {student_name} — {class_type} on {class_date}",
  body: `Hi {student_name},

Thanks for booking your {class_type} with {instructor_name}. Your spot is confirmed.

Here are your class details:
• Date: {class_date}
• Time: {class_time}
• Location: {location}

Please arrive a few minutes early and bring a valid photo ID.

If you have any questions before class, you can reach out to {instructor_name} here: {instructor_email}.`,
};

function savedOrDefault(
  saved: string | null | undefined,
  fallback: string,
  legacy?: string
): string {
  const trimmed = (saved ?? "").replace(/\r\n/g, "\n").trim();
  if (!trimmed) return fallback;
  if (legacy && trimmed === legacy.replace(/\r\n/g, "\n").trim()) return fallback;
  return saved!;
}

/** Return saved content if present, otherwise the generic default for the type. */
export function resolveTemplateContent(
  type: EmailTemplateType,
  saved: { subject?: string | null; body?: string | null } | undefined
): DefaultTemplate {
  const def = DEFAULT_EMAIL_TEMPLATES[type];
  const legacy = type === "confirmation" ? LEGACY_CONFIRMATION : undefined;
  return {
    subject: savedOrDefault(saved?.subject, def.subject, legacy?.subject),
    body: savedOrDefault(saved?.body, def.body, legacy?.body),
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** http(s) links only. `raw` is already HTML-escaped. */
function safeHttpUrl(raw: string): string | null {
  const url = raw.trim();
  if (!/^https?:\/\//i.test(url)) return null;
  if (/[\s"'<>]/.test(url)) return null;
  return url;
}

/** Plain-text body: drop bold markers and expand links to "label (url)". */
export function emailBodyToPlainText(body: string): string {
  return body
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label: string, href: string) => {
      const url = href.trim();
      return /^https?:\/\//i.test(url) ? `${label} (${url})` : label;
    });
}

/**
 * HTML body for the same template source.
 * Supports **bold** and [label](https://...) so class details can be bold
 * and "here" can link to the instructor's What to Bring tab.
 */
export function emailBodyToHtml(body: string): string {
  const withInline = escapeHtml(body)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label: string, href: string) => {
      const url = safeHttpUrl(href);
      if (!url) return match;
      return `<a href="${url}" style="color:#C1440E;text-decoration:underline">${label}</a>`;
    });

  const paragraphs = withInline
    .split(/\n{2,}/)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;line-height:1.5">${block.replace(/\n/g, "<br>")}</p>`
    )
    .join("");

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:16px;color:#141413">${paragraphs}</div>`;
}

/** Replace `{tag}` placeholders. Unknown tags are left unchanged. */
export function applyMergeTags(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}
