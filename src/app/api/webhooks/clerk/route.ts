import { NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { sendClerkVerificationCodeEmail } from "@/lib/clerk-auth-email";

export const runtime = "nodejs";

/** Clerk auth emails we deliver ourselves (CarryClass branding via Resend). */
const HANDLED_SLUGS = new Set(["verification_code", "reset_password_code"]);

export async function POST(req: Request) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET?.trim()) {
    console.error("CLERK_WEBHOOK_SIGNING_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  let event;
  try {
    event = await verifyWebhook(req);
  } catch (err) {
    console.error("[clerk webhook] signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type !== "email.created") {
    return NextResponse.json({ received: true });
  }

  const email = event.data;
  const slug = email.slug ?? "";
  const to = email.to_email_address?.trim();

  // When Delivered by Clerk is ON, Clerk already sent — nothing to do.
  if (email.delivered_by_clerk) {
    return NextResponse.json({ received: true, skipped: "delivered_by_clerk" });
  }

  if (!HANDLED_SLUGS.has(slug) || !to) {
    return NextResponse.json({ received: true, skipped: "unhandled_template" });
  }

  const data = (email.data ?? {}) as Record<string, unknown>;
  const code = String(data.otp_code ?? data.code ?? "").trim();
  if (!code) {
    console.error("[clerk webhook] email.created missing otp_code", { slug, id: email.id });
    return NextResponse.json({ error: "Missing otp_code" }, { status: 422 });
  }

  try {
    await sendClerkVerificationCodeEmail({
      to,
      code,
      requestedAt: typeof data.requested_at === "string" ? data.requested_at : null,
      requestedFrom: typeof data.requested_by === "string" ? data.requested_by : null,
    });
  } catch (err) {
    console.error("[clerk webhook] failed to send auth email", err);
    return NextResponse.json({ error: "Send failed" }, { status: 502 });
  }

  return NextResponse.json({ received: true, delivered: true });
}
