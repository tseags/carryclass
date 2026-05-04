import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

console.log("🔧 Supabase Client Init:", {
  hasUrl: Boolean(supabaseUrl),
  urlPreview: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : "(empty)",
  hasKey: Boolean(supabaseAnonKey),
  keyPreview: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : "(empty)",
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

let vendorReadClient: SupabaseClient | null = null;

/**
 * Server-only reads for vendor listings. Uses `SUPABASE_SERVICE_ROLE_KEY` when set
 * so Row Level Security does not block `select` with the anon key (keep this key
 * secret — never import this helper from client components).
 */
export function supabaseForVendorReads(): SupabaseClient {
  if (vendorReadClient) return vendorReadClient;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (service && supabaseUrl) {
    vendorReadClient = createClient(supabaseUrl, service, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  } else {
    vendorReadClient = supabase;
  }
  return vendorReadClient;
}
