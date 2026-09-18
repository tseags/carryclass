import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }

  const baseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"
  ).replace(/\/$/, "");

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    // Browser navigates here via <a href>; send users back to onboarding
    // instead of dumping a raw JSON 500 in the address bar.
    return NextResponse.redirect(
      `${baseUrl}/onboard/step/3?error=google_not_configured`
    );
  }

  const redirectUri = `${baseUrl}/api/calendar/google-callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.readonly",
    access_type: "offline",
    prompt: "consent",
    state: userId,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
