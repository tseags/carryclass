/** Exchange a vendor's Google refresh token for a short-lived access token. */
export async function getGoogleAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar not configured");
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    throw new Error("Failed to refresh Google token");
  }

  const data = (await tokenRes.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Failed to refresh Google token");
  }
  return data.access_token;
}
