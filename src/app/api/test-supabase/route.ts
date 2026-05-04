import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const tableName =
    process.env.NEXT_PUBLIC_SUPABASE_VENDORS_TABLE?.trim() || "CarryClass Vendor Data";

  console.log("API Test - Table name:", tableName);

  const { data, error, count } = await supabase
    .from(tableName)
    .select("*", { count: "exact" })
    .limit(5);

  return NextResponse.json({
    tableName,
    error: error
      ? {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        }
      : null,
    count,
    rowsReturned: data?.length,
    firstRow: data?.[0],
    allEnvVars: {
      hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
      hasKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()),
      hasTableName: Boolean(process.env.NEXT_PUBLIC_SUPABASE_VENDORS_TABLE?.trim()),
      tableName: process.env.NEXT_PUBLIC_SUPABASE_VENDORS_TABLE ?? null,
    },
  });
}
