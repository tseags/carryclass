import { NextResponse } from "next/server";
import { getOutreachUserId, outreachNotFound } from "@/lib/outreach/auth";
import { listOutreachContacts } from "@/lib/outreach/contacts";
import { syncOutreachContacts } from "@/lib/outreach/sync";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST() {
  if (!(await getOutreachUserId())) return outreachNotFound();
  const report = await syncOutreachContacts();
  return NextResponse.json({ report, contacts: await listOutreachContacts() });
}
