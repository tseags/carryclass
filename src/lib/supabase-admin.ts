import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient | null = null;

/**
 * Server-only Supabase client that bypasses RLS via service role key.
 * Never import this from client components.
 *
 * Requires `SUPABASE_SERVICE_ROLE_KEY` for the same project as
 * `NEXT_PUBLIC_SUPABASE_URL` (onboarding). Do not fall back to the anon key —
 * inserts would fail RLS or look like mysterious auth errors.
 */
export function supabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
  }
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set (required for onboarding writes)"
    );
  }
  adminClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  return adminClient;
}
