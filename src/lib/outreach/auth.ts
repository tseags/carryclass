import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

/** Signed-in Clerk user id when it is on the outreach allowlist, else null. */
export async function getOutreachUserId(): Promise<string | null> {
  const { userId } = await auth();
  return isOutreachUser(userId) ? userId : null;
}

export function outreachNotFound(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
