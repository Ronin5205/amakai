import type { Provider } from "@supabase/supabase-js"
import { GithubLogoIcon, GoogleLogoIcon } from "@phosphor-icons/react"

export interface OAuthProviderConfig {
  id: Provider
  label: string
  icon: typeof GoogleLogoIcon
}

export const oauthProviders = [
  {
    id: "google",
    label: "Continue with Google",
    icon: GoogleLogoIcon,
  },
  {
    id: "github",
    label: "Continue with GitHub",
    icon: GithubLogoIcon,
  },
] as const satisfies readonly OAuthProviderConfig[]

export function getAuthCallbackUrl(nextPath = "/") {
  if (typeof window === "undefined") {
    return `/auth/callback?next=${encodeURIComponent(nextPath)}`
  }

  const url = new URL("/auth/callback", window.location.origin)
  url.searchParams.set("next", nextPath)
  return url.toString()
}
