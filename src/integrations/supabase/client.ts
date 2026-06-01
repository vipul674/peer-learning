import { createClient } from "@supabase/supabase-js";
import { supabaseUrl, supabaseAnonKey } from "@/env";
import type { Database } from "./types";

export const supabaseMisconfigured = !supabaseUrl || !supabaseAnonKey;

if (supabaseMisconfigured) {
  throw new Error(
    "Supabase is misconfigured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or their supported aliases) before starting the app."
  );
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);