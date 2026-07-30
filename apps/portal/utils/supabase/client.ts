import { createBrowserClient } from "@supabase/ssr"

import { requireSupabaseEnv } from "@/utils/supabase/env"

export function createClient() {
  const { url, key } = requireSupabaseEnv("browser client")

  return createBrowserClient(url, key)
}
