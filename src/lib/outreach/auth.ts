import { auth } from "@clerk/nextjs/server";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { outreachSurfaceAllowed } from "./access";

export function outreachAllowedUserIds(): Set<string> {
  return new Set(
    (process.env.OUTREACH_CLERK_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

export function isOutreachUser(userId: string | null | undefined): userId is string {
  return Boolean(userId) && outreachAllowedUserIds().has(userId as string);
}

/**
 * Local operator id for CRM routes. Null on the public site, so those routes 404.
 * A signed-in Clerk id is used when present; otherwise a fixed local id.
 * Stages, notes, and call history are stored on the contact rows, not on this id.
 */
export async function getOutreachUserId(): Promise<string | null> {
  const host = (await headers()).get("host");
  if (!outreachSurfaceAllowed(host)) return null;
  const { userId } = await auth();
  return userId ?? "local";
}

export function outreachNotFound(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
