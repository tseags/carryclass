import { NextResponse } from "next/server";

function maskKey(key: string | undefined): string | null {
  if (!key?.trim()) return null;
  return key.slice(0, 20);
}

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: maskKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    NEXT_PUBLIC_SUPABASE_VENDORS_TABLE:
      process.env.NEXT_PUBLIC_SUPABASE_VENDORS_TABLE ?? null,
    NEXT_PUBLIC_SUPABASE_VENDORS_SHAPE:
      process.env.NEXT_PUBLIC_SUPABASE_VENDORS_SHAPE ?? null,
  });
}
