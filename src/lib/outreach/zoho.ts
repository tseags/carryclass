/**
 * Read-only Zoho Mail access for ty@getcarryclass.com.
 *
 * One-time setup (Zoho API Console → Self Client or Server-based app):
 *   1. Create a client at https://api-console.zoho.com and note the client id/secret.
 *   2. Authorize with scopes ZohoMail.messages.READ,ZohoMail.folders.READ,ZohoMail.accounts.READ
 *      and access_type=offline, e.g. open:
 *        https://accounts.zoho.com/oauth/v2/auth?response_type=code&access_type=offline&prompt=consent
 *          &client_id=$ZOHO_CLIENT_ID&redirect_uri=$REDIRECT_URI
 *          &scope=ZohoMail.messages.READ,ZohoMail.folders.READ,ZohoMail.accounts.READ
 *      (Self Client: generate the code in the console with the same scopes instead.)
 *   3. Exchange the code for a refresh token:
 *        curl -X POST https://accounts.zoho.com/oauth/v2/token \
 *          -d grant_type=authorization_code -d code=$CODE \
 *          -d client_id=$ZOHO_CLIENT_ID -d client_secret=$ZOHO_CLIENT_SECRET \
 *          -d redirect_uri=$REDIRECT_URI
 *      The response's `api_domain` tells you the data center (com, eu, in, …).
 *   4. Find the account id:
 *        curl -H "Authorization: Zoho-oauthtoken $ACCESS_TOKEN" https://mail.zoho.com/api/accounts
 */

const REQUIRED_ENV = [
  "ZOHO_CLIENT_ID",
  "ZOHO_CLIENT_SECRET",
  "ZOHO_REFRESH_TOKEN",
  "ZOHO_ACCOUNT_ID",
] as const;

export function zohoMissingEnv(): string[] {
  return REQUIRED_ENV.filter((name) => !process.env[name]?.trim());
}

function accountsBase(): string {
  return `https://${process.env.ZOHO_ACCOUNTS_DOMAIN?.trim() || "accounts.zoho.com"}`;
}

function mailBase(): string {
  return `https://${process.env.ZOHO_MAIL_API_DOMAIN?.trim() || "mail.zoho.com"}`;
}

function mailboxAddress(): string {
  return (process.env.ZOHO_MAIL_ADDRESS?.trim() || "ty@getcarryclass.com").toLowerCase();
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: process.env.ZOHO_REFRESH_TOKEN!.trim(),
    client_id: process.env.ZOHO_CLIENT_ID!.trim(),
    client_secret: process.env.ZOHO_CLIENT_SECRET!.trim(),
  });
  const res = await fetch(`${accountsBase()}/oauth/v2/token`, { method: "POST", body });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !json.access_token) {
    throw new Error(`Zoho token refresh failed: ${json.error ?? res.status}`);
  }
  cachedToken = {
    value: json.access_token,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

async function zohoGet<T>(path: string): Promise<T> {
  const token = await accessToken();
  const res = await fetch(`${mailBase()}/api/accounts/${process.env.ZOHO_ACCOUNT_ID!.trim()}${path}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
    cache: "no-store",
  });
  const json = (await res.json()) as { data?: T; status?: { description?: string } };
  if (!res.ok) throw new Error(`Zoho ${res.status}: ${json.status?.description ?? "request failed"}`);
  return json.data as T;
}

export interface ZohoMessageSummary {
  messageId: string;
  folderId: string;
  subject: string;
  from: string;
  to: string;
  receivedAt: string;
  direction: "inbound" | "outbound";
  summary: string;
}

interface ZohoSearchItem {
  messageId: string;
  folderId: string;
  subject?: string;
  fromAddress?: string;
  sender?: string;
  toAddress?: string;
  receivedTime?: string;
  sentDateInGMT?: string;
  summary?: string;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

/** Plain text from an email's HTML; the drawer never renders mail HTML. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const listCache = new Map<string, { at: number; messages: ZohoMessageSummary[] }>();
const LIST_CACHE_MS = 2 * 60_000;

/** Messages to or from any of these addresses, newest first. */
export async function searchZohoMessages(emails: string[]): Promise<ZohoMessageSummary[]> {
  const addresses = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (addresses.length === 0) return [];
  const cacheKey = addresses.sort().join(",");
  const hit = listCache.get(cacheKey);
  if (hit && Date.now() - hit.at < LIST_CACHE_MS) return hit.messages;

  const searchKey = addresses.map((a) => `sender:${a}::or:to:${a}`).join("::or:");
  const params = new URLSearchParams({ searchKey, limit: "25", includeto: "true" });
  const items = (await zohoGet<ZohoSearchItem[]>(`/messages/search?${params}`)) ?? [];
  const me = mailboxAddress();

  const messages = items
    .map((m): ZohoMessageSummary => {
      const from = decodeEntities(m.fromAddress ?? m.sender ?? "");
      const at = Number(m.receivedTime ?? m.sentDateInGMT ?? 0);
      return {
        messageId: String(m.messageId),
        folderId: String(m.folderId),
        subject: decodeEntities(m.subject ?? "(no subject)"),
        from,
        to: decodeEntities(m.toAddress ?? ""),
        receivedAt: new Date(at || Date.now()).toISOString(),
        direction: from.toLowerCase().includes(me) ? "outbound" : "inbound",
        summary: decodeEntities(m.summary ?? ""),
      };
    })
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));

  listCache.set(cacheKey, { at: Date.now(), messages });
  return messages;
}

export async function getZohoMessageText(folderId: string, messageId: string): Promise<string> {
  const data = await zohoGet<{ content?: string }>(
    `/folders/${encodeURIComponent(folderId)}/messages/${encodeURIComponent(messageId)}/content`
  );
  return htmlToText(data?.content ?? "");
}
