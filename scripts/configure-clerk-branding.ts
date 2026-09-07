/**
 * Clerk auth email branding setup helper.
 *
 * Clerk sign-up / sign-in verification emails use the Application name from the
 * Clerk Dashboard (currently "CCW Courses" on the dev instance). This script
 * prints the exact dashboard steps and webhook setup for CarryClass-branded
 * delivery via Resend.
 *
 * Usage: npx tsx scripts/configure-clerk-branding.ts
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env.development.local") });
config({ path: resolve(process.cwd(), ".env") });

const BRAND = "CarryClass";
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001").replace(/\/$/, "");
const WEBHOOK_URL = `${APP_URL}/api/webhooks/clerk`;

async function main() {
  const secret = process.env.CLERK_SECRET_KEY?.trim();
  if (!secret) {
    console.error("CLERK_SECRET_KEY is not set.");
    process.exit(1);
  }

  const res = await fetch("https://api.clerk.com/v1/instance", {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const instance = (await res.json()) as {
    id?: string;
    environment_type?: string;
  };

  const env = instance.environment_type ?? "unknown";
  const instanceId = instance.id ?? "(unknown)";

  console.log(`\nClerk instance: ${instanceId} (${env})\n`);
  console.log("═".repeat(60));
  console.log(`CarryClass auth email branding (${BRAND})`);
  console.log("═".repeat(60));

  console.log(`
OPTION A — Quick fix (Clerk still sends the email)
────────────────────────────────────────────────
1. Open https://dashboard.clerk.com
2. Select this ${env} instance
3. Go to **Configure → General** (or **Settings**)
4. Set **Application name** to: ${BRAND}
5. Under **Branding**, upload the CarryClass logo (/public/images/carryclass-logo.png)
6. Save — new verification emails will show "${BRAND}" instead of "CCW Courses"

Repeat for production if you use a separate Clerk instance.


OPTION B — Full control (Resend delivers branded emails)
────────────────────────────────────────────────────────
Requires RESEND_API_KEY (already used for claim codes).

1. Clerk Dashboard → **Configure → Webhooks**
   - Add endpoint: ${WEBHOOK_URL}
   - Subscribe to: email.created
   - Copy the signing secret → CLERK_WEBHOOK_SIGNING_SECRET in .env.local / Vercel

2. Clerk Dashboard → **Configure → Emails**
   - Open **Verification code** template
   - Turn OFF **Delivered by Clerk**
   - (Optional) Repeat for **Reset password code**

3. Set in .env.local (optional — defaults shown):
   CLERK_AUTH_EMAIL_FROM="${BRAND} <notifications@getcarryclass.com>"

4. For local webhook testing, expose ${APP_URL} with ngrok/cloudflared.

After Option B, verification emails are sent by this app via Resend with
${BRAND} branding (subject, header, footer, from name).
`);

  const hasResend = Boolean(process.env.RESEND_API_KEY?.trim());
  const hasWebhookSecret = Boolean(process.env.CLERK_WEBHOOK_SIGNING_SECRET?.trim());

  console.log("Current env:");
  console.log(`  RESEND_API_KEY:        ${hasResend ? "set" : "missing"}`);
  console.log(`  CLERK_WEBHOOK_SIGNING_SECRET: ${hasWebhookSecret ? "set" : "missing"}`);
  console.log(`  NEXT_PUBLIC_APP_URL:   ${APP_URL}`);
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
