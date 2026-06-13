import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getVendorProfile, updateVendorProfile } from "@/lib/onboarding-db";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface GoogleCalendarListEntry {
  id: string;
  summary: string;
  primary?: boolean;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}/onboard/step/3?error=${encodeURIComponent(error)}`
    );
  }

  if (!code || state !== userId) {
    return NextResponse.redirect(`${baseUrl}/onboard/step/3?error=invalid_state`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${baseUrl}/api/calendar/google-callback`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${baseUrl}/onboard/step/3?error=token_exchange`);
  }

  const tokens: GoogleTokenResponse = await tokenRes.json();
  const accessToken = tokens.access_token;
  const refreshToken = tokens.refresh_token;

  // Get primary calendar ID
  const calListRes = await fetch(
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  let calendarId = "primary";
  if (calListRes.ok) {
    const calList = await calListRes.json();
    const primary = (calList.items as GoogleCalendarListEntry[])?.find(
      (c) => c.primary
    );
    if (primary) calendarId = primary.id;
  }

  const vendor = await getVendorProfile(userId);
  if (!vendor) {
    return NextResponse.redirect(`${baseUrl}/onboard/step/3?error=no_vendor`);
  }

  await updateVendorProfile(vendor.id, {
    google_refresh_token: refreshToken ?? null,
    google_calendar_id: calendarId,
    calendar_type: "google",
  });

  return NextResponse.redirect(`${baseUrl}/onboard/step/3?google_connected=1`);
}
