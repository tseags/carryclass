"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Temporary client-side probe: logs anon-key fetch results in the browser console.
 * Remove after debugging Supabase connectivity.
 */
export function SupabaseDebugProbe() {
  useEffect(() => {
    async function debugQuery() {
      const tableName =
        process.env.NEXT_PUBLIC_SUPABASE_VENDORS_TABLE?.trim() || "CarryClass Vendor Data";
      console.log("Homepage - About to query:", tableName);

      const { data, error } = await supabase.from(tableName).select("*").limit(5);

      console.log(
        "Homepage query result:",
        JSON.stringify(
          {
            rowCount: data?.length ?? 0,
            error: error
              ? { message: error.message, details: error.details, hint: error.hint, code: error.code }
              : null,
            firstRow: data?.[0] ?? null,
          },
          null,
          2
        )
      );
      if (error) {
        console.error("❌ Homepage Supabase ERROR DETAILS:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
      }
    }
    void debugQuery();
  }, []);

  return null;
}
