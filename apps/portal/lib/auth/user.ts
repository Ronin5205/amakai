import type { User } from "@supabase/supabase-js"

export const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/

export function normalizeUsername(value: string) {
  return value.trim().toLowerCase()
}

export function isValidUsername(value: string) {
  return USERNAME_PATTERN.test(normalizeUsername(value))
}

export function getUsername(user: User | null | undefined) {
  if (!user) {
    return null
  }

  const metadata = user.user_metadata
  const candidates = [
    metadata.username,
    metadata.user_name,
    metadata.preferred_username,
    metadata.full_name,
    metadata.name,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim()
    }
  }

  const emailPrefix = user.email?.split("@")[0]
  return emailPrefix ?? null
}

export function getUsernameInitials(username: string) {
  const parts = username.split(/[\s._-]+/).filter(Boolean)

  if (parts.length >= 2) {
    return parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
  }

  return username.slice(0, 2).toUpperCase()
}
