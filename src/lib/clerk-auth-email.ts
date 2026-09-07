import { Resend } from "resend";

const BRAND = "CarryClass";
const DEFAULT_FROM = `CarryClass <notifications@getcarryclass.com>`;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function fromAddress(): string {
  return process.env.CLERK_AUTH_EMAIL_FROM?.trim() || DEFAULT_FROM;
}

/** Send a CarryClass-branded sign-in / sign-up verification code (Clerk webhook delivery). */
export async function sendClerkVerificationCodeEmail(input: {
  to: string;
  code: string;
  requestedAt?: string | null;
  requestedFrom?: string | null;
}): Promise<void> {
  const resend = getResend();
  if (!resend) {
    throw new Error("RESEND_API_KEY is not set — cannot deliver Clerk auth emails");
  }

  const requestContext =
    input.requestedAt && input.requestedFrom
      ? `This code was requested from ${input.requestedFrom} at ${input.requestedAt}.`
      : input.requestedAt
        ? `This code was requested at ${input.requestedAt}.`
        : null;

  const text = [
    `Your ${BRAND} verification code`,
    "",
    "Enter this code when prompted:",
    "",
    `  ${input.code}`,
    "",
    "To protect your account, do not share this code.",
    "",
    requestContext ? `${requestContext} If you didn't make this request, you can safely ignore this email.` : "If you didn't make this request, you can safely ignore this email.",
    "",
    `— ${BRAND}`,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:480px;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;padding:32px 28px;">
          <tr>
            <td style="font-size:20px;font-weight:700;padding-bottom:8px;">${BRAND}</td>
          </tr>
          <tr>
            <td style="font-size:22px;font-weight:700;padding-bottom:12px;">Verification code</td>
          </tr>
          <tr>
            <td style="font-size:15px;line-height:1.6;color:#52525b;padding-bottom:20px;">
              Enter the following verification code when prompted:
            </td>
          </tr>
          <tr>
            <td style="font-size:32px;font-weight:700;letter-spacing:0.12em;padding:20px 0;text-align:center;background:#f4f4f5;border-radius:8px;">
              ${input.code}
            </td>
          </tr>
          <tr>
            <td style="font-size:14px;line-height:1.6;color:#52525b;padding-top:20px;">
              To protect your account, do not share this code.
            </td>
          </tr>
          <tr>
            <td style="font-size:13px;line-height:1.6;color:#71717a;padding-top:24px;border-top:1px solid #e4e4e7;margin-top:24px;">
              <strong>Didn't request this?</strong><br />
              ${requestContext ? `${requestContext} ` : ""}If you didn't make this request, you can safely ignore this email.
            </td>
          </tr>
          <tr>
            <td style="font-size:12px;color:#a1a1aa;padding-top:24px;">
              © ${new Date().getFullYear()} ${BRAND}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: input.to,
    subject: `${input.code} is your ${BRAND} verification code`,
    text,
    html,
  });

  if (error) {
    throw new Error(error.message || "Failed to send verification email");
  }
}
