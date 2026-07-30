import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import { requireSupabaseEnv } from "@/utils/supabase/env"

export async function createClient() {
  const cookieStore = await cookies()
  const { url, key } = requireSupabaseEnv("server client")

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server Components cannot write cookies; proxy refreshes sessions.
        }
      },
    },
  })
}
