import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/supabase/database.types";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

export async function createServerSupabase() {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key || !isSupabaseConfigured()) return null;

  const cookieStore = await cookies();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component; proxy refreshes the session.
        }
      },
    },
  });
}

export function createAdminSupabase() {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createWriteSupabase() {
  const url = getSupabaseUrl();
  const key = getSupabasePublishableKey();
  if (!url || !key || !isSupabaseConfigured()) return null;
  return (
    createAdminSupabase() ??
    createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  );
}
