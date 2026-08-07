import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cron client: signs in with the shared clan account.
 * Avoids needing a valid SUPABASE_SERVICE_ROLE_KEY.
 */
export async function createCronClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.AUTH_USER;
  const password = process.env.AUTH_PASSWORD;

  if (!url || !anon) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!email || !password) {
    throw new Error("Missing AUTH_USER or AUTH_PASSWORD for cron auth");
  }

  const supabase = createClient(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(`Cron auth failed: ${error.message}`);
  }

  return supabase;
}
