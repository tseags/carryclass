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
  "{student_name}",
  "{class_type}",
  "{class_date}",
  "{class_time}",
  "{instructor_name}",
  "{location}",
  "{rebooking_link}",
] as const;

interface DefaultTemplate {
  subject: string;
  body: string;
}

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateType, DefaultTemplate> = {
  confirmation: {
    subject: "You're booked, {student_name} — {class_type} on {class_date}",
    body: `Hi {student_name},

Thanks for booking your {class_type} with {instructor_name}. Your spot is confirmed.

Here are your class details:
• Date: {class_date}
• Time: {class_time}
• Location: {location}

Please arrive a few minutes early and bring a valid photo ID. If you have any questions before class, just reply to this email.

See you soon,
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

/** Return saved content if present, otherwise the generic default for the type. */
export function resolveTemplateContent(
  type: EmailTemplateType,
  saved: { subject?: string | null; body?: string | null } | undefined
): DefaultTemplate {
  const def = DEFAULT_EMAIL_TEMPLATES[type];
  return {
    subject: saved?.subject?.trim() ? saved.subject! : def.subject,
    body: saved?.body?.trim() ? saved.body! : def.body,
  };
}
