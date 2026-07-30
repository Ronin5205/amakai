export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  }
}

export function requireSupabaseEnv(context?: string) {
  const { url, key } = getSupabaseEnv()

  if (!url || !key) {
    throw new Error(
      `Missing Supabase env vars${context ? ` (${context})` : ""}. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to apps/portal/.env.local`
    )
  }

  return { url, key }
}
