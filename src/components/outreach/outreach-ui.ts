import type { OutreachStageId } from "@/lib/outreach/sequence";

export const TAG_LABELS: Record<string, string> = {
  "website-no-booking": "Website · no booking",
  "website-has-booking": "Website · has booking",
  "no-website": "No website",
  "multi-county": "Multi-county",
  "multi-location": "Multiple locations",
  "has-email": "Has email",
  "no-email": "No email",
  "has-phone": "Has phone",
  "no-phone": "No phone",
  "on-carryclass": "On CarryClass",
  "needs-review": "Needs review",
};

export const BOOKING_LABELS: Record<string, string> = {
  direct_booking: "Books online",
  inquiry_only: "Inquiry only",
  none: "No booking",
  unclear: "Unclear",
};

export function stagePill(stage: OutreachStageId): string {
  switch (stage) {
    case "called":
    case "emailed":
    case "follow_up":
      return "bg-[#C1440E]/10 text-[#C1440E]";
    case "replied":
    case "interested":
      return "bg-emerald-50 text-emerald-700";
    case "claimed":
      return "bg-blue-50 text-blue-700";
    case "not_interested":
    case "do_not_contact":
      return "bg-gray-100 text-gray-400";
    default:
      return "bg-gray-100 text-gray-600";
  }
}

export function websiteHost(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function telHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `tel:+1${digits.slice(-10)}`;
}

export function formatDuration(seconds: number | null): string | null {
  if (seconds == null) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

export const selectClass =
  "rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-[#C1440E]/40 focus:outline-none focus:ring-1 focus:ring-[#C1440E]/30";

export const primaryButtonClass =
  "rounded-lg !bg-[#C1440E] px-4 py-2 text-sm font-medium !text-white transition-colors hover:!bg-[#a53a0c] disabled:opacity-50";

export const secondaryButtonClass =
  "rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50";
