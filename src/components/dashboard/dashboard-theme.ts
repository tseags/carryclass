import { DM_Sans } from "next/font/google";

/** Dashboard-only typeface; applied on the dashboard wrapper, not site-wide. */
export const dashboardFont = DM_Sans({ subsets: ["latin"], display: "swap" });

/*
 * Class tokens for the instructor dashboard's warm theme.
 * Webflow's unlayered element styles (h1–h3 size/color/margins, p margins, link
 * color/underline) beat Tailwind's layered utilities, so typography and link
 * tokens that land on those elements use `!`.
 */

export const DASH_PAGE_BG = "bg-[#F6F3EE]";
export const DASH_SIDEBAR_BG = "bg-[#FBF9F6]";

export const DASH_INK = "!text-[#1F1B16]";
/** Secondary text; darker than the reference #8A837A so small text keeps AA contrast. */
export const DASH_MUTED = "!text-[#7A7268]";
/** Decorative only (icons, dividers); too light for body text. */
export const DASH_SUBTLE = "text-[#A39B91]";

export const DASH_BORDER = "border-[#ECE7E0]";
export const DASH_DIVIDE = "divide-y divide-[#F1ECE5]";
export const DASH_CARD = "rounded-xl border border-[#ECE7E0] bg-white";
export const DASH_SOFT_PANEL = "rounded-xl bg-[#F1ECE5]";

export const DASH_EYEBROW =
  "!m-0 text-xs font-semibold uppercase tracking-[0.14em] !text-[#C1440E]";
export const DASH_HERO_TITLE =
  "!m-0 !text-3xl !font-bold !leading-tight tracking-tight !text-[#1F1B16]";
export const DASH_PAGE_TITLE =
  "!m-0 !text-2xl !font-bold !leading-tight tracking-tight !text-[#1F1B16]";
export const DASH_SUBSECTION_TITLE =
  "!m-0 !text-lg !font-semibold !leading-snug tracking-tight !text-[#1F1B16]";
export const DASH_SECTION_TITLE =
  "!m-0 !text-[15px] !font-semibold !leading-snug tracking-tight !text-[#1F1B16]";
export const DASH_CARD_TITLE = "!m-0 !text-sm !font-semibold !leading-snug !text-[#1F1B16]";
export const DASH_TABLE_HEAD =
  "text-left text-[11px] font-medium uppercase tracking-wider text-[#7A7268]";

export const DASH_LINK =
  "!bg-transparent text-sm font-medium !text-[#C1440E] !no-underline hover:!underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C1440E] rounded";

const BTN_BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium !no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
export const DASH_BTN_PRIMARY = `${BTN_BASE} !bg-[#C1440E] !text-white shadow-sm hover:!bg-[#A93B0C] focus-visible:outline-[#C1440E]`;
export const DASH_BTN_DARK = `${BTN_BASE} !bg-[#2B2520] !text-white shadow-sm hover:!bg-[#1F1B16] focus-visible:outline-[#2B2520]`;
export const DASH_BTN_SECONDARY = `${BTN_BASE} border border-[#E3DDD4] !bg-white !text-[#1F1B16] hover:border-[#D6CEC3] hover:!bg-[#FBF9F6] focus-visible:outline-[#C1440E]`;
export const DASH_BTN_DANGER = `${BTN_BASE} border border-red-200 !bg-white !text-red-700 hover:!bg-red-50 focus-visible:outline-red-600`;

export const DASH_PILL =
  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium";
export const DASH_PILL_SUCCESS = "bg-[#E7F2EA] text-[#2E6A43]";
export const DASH_PILL_ACCENT = "bg-[#C1440E]/10 text-[#A93B0C]";
export const DASH_PILL_NEUTRAL = "bg-[#F1ECE5] text-[#6B645B]";
export const DASH_PILL_INFO = "bg-[#EAF0F6] text-[#3D5A78]";
export const DASH_PILL_WARN = "bg-[#FBF1DF] text-[#8A5A12]";

export const DASH_INPUT =
  "w-full rounded-lg border border-[#E3DDD4] bg-white px-3 py-2 text-sm text-[#1F1B16] placeholder:text-[#A39B91] focus:border-[#C1440E]/50 focus:outline-none focus:ring-2 focus:ring-[#C1440E]/15 disabled:cursor-not-allowed disabled:bg-[#F6F3EE]";

export const DASH_SWITCH_ON = "bg-[#C1440E]";
export const DASH_SWITCH_OFF = "bg-[#E3DDD4]";

const AVATAR_TONES = ["bg-[#C1440E]", "bg-[#2F3B33]", "bg-[#7A6A58]"];

/** Stable muted tone per name so a student keeps the same avatar color. */
export function avatarTone(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}
