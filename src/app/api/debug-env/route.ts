import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function maskKey(key: string | undefined): string | null {
  if (!key?.trim()) return null;
  return key.slice(0, 20);
}

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function testDatabaseQuery(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  if (!process.env.DATABASE_URL?.trim()) {
    return { success: false, error: "DATABASE_URL is not set" };
  }

  try {
    const result = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      "SELECT count(*) AS count FROM carry_class_vendor_data"
    );
    return { success: true, count: Number(result[0]?.count ?? 0) };
  } catch (error) {
    return { success: false, error: formatError(error) };
  }
}

export async function GET() {
  const databaseQuery = await testDatabaseQuery();

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: maskKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    NEXT_PUBLIC_SUPABASE_VENDORS_TABLE:
      process.env.NEXT_PUBLIC_SUPABASE_VENDORS_TABLE ?? null,
    NEXT_PUBLIC_SUPABASE_VENDORS_SHAPE:
      process.env.NEXT_PUBLIC_SUPABASE_VENDORS_SHAPE ?? null,
    databaseQuery,
  });
}
