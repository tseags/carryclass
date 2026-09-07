/**
 * Pre-flight for onboarding step 5 (Stripe Connect).
 *
 * Step 5 is a hard gate: /api/onboarding/step/5 returns 400 until the vendor row
 * has a stripe_account_id, and only /api/stripe-connect/callback ever sets one.
 * So a misconfigured Connect app blocks the whole funnel from reaching step 6,
 * publish, and /dashboard/vendor.
 *
 * This verifies the credentials against the live Stripe API and checks that the
 * OAuth redirect URI is actually registered on the Connect application.
 *
 * Usage: npm run check:stripe-connect
 */
import { config } from "dotenv";
import { resolve } from "node:path";

for (const file of [".env", ".env.development", ".env.local", ".env.development.local"]) {
  config({ path: resolve(process.cwd(), file), override: true, quiet: true });
}

type Level = "ok" | "warn" | "fail";

const results: Array<{ level: Level; label: string; detail: string }> = [];

function record(level: Level, label: string, detail: string): void {
  results.push({ level, label, detail });
}

function mode(key: string): "test" | "live" | "unknown" {
  if (key.includes("_test_")) return "test";
  if (key.includes("_live_")) return "live";
  return "unknown";
}

function redirectUri(): string {
  if (process.env.STRIPE_CONNECT_REDIRECT_URI?.trim()) {
    return process.env.STRIPE_CONNECT_REDIRECT_URI.trim();
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  return `${baseUrl.replace(/\/$/, "")}/api/stripe-connect/callback`;
}

async function checkSecretKey(secretKey: string): Promise<void> {
  if (!secretKey.startsWith("sk_")) {
    record(
      "fail",
      "STRIPE_SECRET_KEY format",
      secretKey.startsWith("rk_")
        ? "Restricted key (rk_) — Connect OAuth requires a full secret key (sk_test_ / sk_live_)."
        : "Must start with sk_test_ or sk_live_."
    );
    return;
  }
  record("ok", "STRIPE_SECRET_KEY format", `Secret key in ${mode(secretKey)} mode.`);

  const res = await fetch("https://api.stripe.com/v1/account", {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const body = (await res.json()) as {
    id?: string;
    error?: { message?: string };
    settings?: { dashboard?: { display_name?: string | null } };
  };

  if (!res.ok) {
    record("fail", "STRIPE_SECRET_KEY live check", body.error?.message ?? `HTTP ${res.status}`);
    return;
  }
  const name = body.settings?.dashboard?.display_name;
  record("ok", "STRIPE_SECRET_KEY live check", `Authenticated as ${body.id}${name ? ` (${name})` : ""}.`);
}

/**
 * Ask Stripe to render the consent screen for exactly the URL the connect route
 * builds. Stripe validates client_id and redirect_uri before rendering, so a 200
 * means the Connect app is set up and this redirect URI is registered.
 *
 * Note: /oauth/authorize only 302s to /oauth/v2/authorize without validating
 * anything, so redirects must be followed or every config looks healthy.
 */
async function checkAuthorizeUrl(clientId: string, uri: string): Promise<void> {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    scope: "read_write",
    redirect_uri: uri,
    state: "preflight-probe",
  });

  const res = await fetch(`https://connect.stripe.com/oauth/authorize?${params}`, {
    redirect: "follow",
    headers: { "User-Agent": "carryclass-preflight" },
  });

  if (res.ok) {
    record("ok", "OAuth authorize probe", "Stripe rendered the consent screen — client_id and redirect URI are both valid.");
    return;
  }

  let message = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    message = body.error?.message ?? message;
  } catch {
    /* non-JSON error page; fall back to the status code */
  }

  if (/redirect uri/i.test(message)) {
    record(
      "fail",
      "OAuth redirect URI",
      `Not registered on the Connect app. Add exactly: ${uri}\n      (Stripe Dashboard → Connect → Settings → Onboarding options → OAuth → Redirects)`
    );
    return;
  }

  if (/no application matches/i.test(message)) {
    record(
      "fail",
      "OAuth client_id",
      `Stripe does not recognize ${clientId}. Copy the client id from Connect → Settings (test and live have different ones).`
    );
    return;
  }

  record("warn", "OAuth authorize probe", `Stripe rejected the request: ${message}`);
}

async function main(): Promise<void> {
  console.log("Stripe Connect pre-flight (onboarding step 5)");
  console.log("═".repeat(46));

  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const clientId = process.env.STRIPE_CLIENT_ID?.trim();
  const uri = redirectUri();

  if (!secretKey) {
    record("fail", "STRIPE_SECRET_KEY", "Unset — step 5 can never complete.");
  } else {
    await checkSecretKey(secretKey);
  }

  if (!clientId) {
    record("fail", "STRIPE_CLIENT_ID", "Unset — /api/stripe-connect/connect redirects back with a config error.");
  } else if (!clientId.startsWith("ca_")) {
    record("fail", "STRIPE_CLIENT_ID format", `Expected a Connect client id starting with ca_, got "${clientId.slice(0, 12)}…".`);
  } else {
    record("ok", "STRIPE_CLIENT_ID format", `${clientId}`);
  }

  record(
    process.env.STRIPE_CONNECT_REDIRECT_URI?.trim() ? "ok" : "warn",
    "Redirect URI",
    process.env.STRIPE_CONNECT_REDIRECT_URI?.trim()
      ? uri
      : `Derived from NEXT_PUBLIC_APP_URL: ${uri}\n      (set STRIPE_CONNECT_REDIRECT_URI to pin it explicitly)`
  );

  if (secretKey && clientId?.startsWith("ca_")) {
    await checkAuthorizeUrl(clientId, uri);
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET?.trim()) {
    record(
      "warn",
      "STRIPE_WEBHOOK_SECRET",
      "Unset — /api/webhooks/stripe rejects events. Not required for step 5, only for booking payments."
    );
  } else {
    record("ok", "STRIPE_WEBHOOK_SECRET", "Set.");
  }

  console.log("");
  for (const r of results) {
    const icon = r.level === "ok" ? "✓" : r.level === "warn" ? "!" : "✗";
    console.log(`${icon} ${r.label}: ${r.detail}`);
  }

  const fails = results.filter((r) => r.level === "fail").length;
  const warns = results.filter((r) => r.level === "warn").length;
  const oks = results.filter((r) => r.level === "ok").length;

  console.log("");
  console.log(`${oks} ok · ${warns} warning · ${fails} blocking`);
  if (fails > 0) {
    console.log("\nStep 5 will block the funnel until the items above are fixed.");
  }
  process.exitCode = fails > 0 ? 1 : 0;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
