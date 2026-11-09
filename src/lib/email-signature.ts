/**
 * CarryClass HTML/plain-text email signature (no phone).
 * Matches the brand lockup: name + site link, tagline, logo.
 */
import { SITE_URL } from "@/lib/site-url";

const BRAND = "#C1440E";
const TAGLINE = "Connecting Californians with trusted CCW instructors";

function absoluteAsset(path: string): string {
  const base = SITE_URL.replace(/\/$/, "");
  return path.startsWith("http") ? path : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function carryClassEmailSignatureHtml(): string {
  const siteHref = SITE_URL;
  const siteLabel = "getcarryclass.com";
  const logoSrc = absoluteAsset("/images/carryclass-logo.png");

  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;border-collapse:collapse;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;width:100%;max-width:560px;">
  <tr>
    <td style="padding:0 0 16px;border-bottom:1px solid #e5e7eb;font-size:0;line-height:0;">&nbsp;</td>
  </tr>
  <tr>
    <td style="padding:16px 0 0;font-size:14px;line-height:1.4;color:#111827;">
      <span style="font-weight:700;color:${BRAND};">CarryClass</span>
      <span style="color:#9ca3af;">&nbsp;|&nbsp;</span>
      <a href="${siteHref}" style="color:#2563eb;text-decoration:underline;">${siteLabel}</a>
    </td>
  </tr>
  <tr>
    <td style="padding:4px 0 0;font-size:13px;line-height:1.4;color:#111827;">
      ${TAGLINE}
    </td>
  </tr>
  <tr>
    <td style="padding:14px 0 0;">
      <a href="${siteHref}" style="text-decoration:none;">
        <img src="${logoSrc}" width="153" height="28" alt="CarryClass" style="display:block;border:0;outline:none;text-decoration:none;height:28px;width:153px;" />
      </a>
    </td>
  </tr>
</table>
  `.trim();
}

export function carryClassEmailSignatureText(): string {
  return [
    "---",
    "CarryClass | getcarryclass.com",
    TAGLINE,
    SITE_URL,
  ].join("\n");
}
