import { createClient } from "@supabase/supabase-js"

import { requireSupabaseEnv } from "@/utils/supabase/env"

/**
 * Service-role client for inbound webhooks / email push handlers
 * that have no user session. Only use server-side.
 */
export function createAdminClient() {
  const { url } = requireSupabaseEnv("admin client")
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!secretKey) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY. Required for inbound webhook/email handlers."
    )
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
