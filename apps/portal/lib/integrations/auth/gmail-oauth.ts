import { createOAuthState } from "@/lib/data/secrets"
import { upsertOAuthSecret } from "@/lib/data/secrets"
import type { SecretMetadata } from "@/lib/domain/secret"
import { defaultOAuthSecretName } from "@/lib/validation/resource-names"

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ")

function requireGmailOAuthEnv() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_OAUTH_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3001"}/auth/integrations/gmail`

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET. Add them to apps/portal/.env.local"
    )
  }

  return { clientId, clientSecret, redirectUri }
}

export async function buildGmailAuthorizeUrl(secretName?: string) {
  const { clientId, redirectUri } = requireGmailOAuthEnv()
  const state = await createOAuthState({
    provider: "gmail",
    secretName,
    redirectPath: "/resources/secrets",
  })

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export async function exchangeGmailCode(code: string) {
  const { clientId, clientSecret, redirectUri } = requireGmailOAuthEnv()

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gmail token exchange failed: ${text}`)
  }

  const json = (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    token_type?: string
    scope?: string
  }

  return json
}

export async function refreshGmailAccessToken(refreshToken: string) {
  const { clientId, clientSecret } = requireGmailOAuthEnv()

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gmail token refresh failed: ${text}`)
  }

  return (await response.json()) as {
    access_token: string
    expires_in?: number
    token_type?: string
    scope?: string
  }
}

export async function fetchGmailUserEmail(accessToken: string) {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!response.ok) {
    return undefined
  }

  const json = (await response.json()) as { email?: string }
  return json.email
}

export async function saveGmailOAuthSecret(input: {
  code: string
  secretName?: string
}) {
  const tokens = await exchangeGmailCode(input.code)
  const accountEmail = await fetchGmailUserEmail(tokens.access_token)
  const expiresAt =
    typeof tokens.expires_in === "number"
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : undefined

  const metadata: SecretMetadata = {
    accountEmail,
    scopes: tokens.scope?.split(" ").filter(Boolean),
    expiresAt,
    refreshStatus: "ok",
    provider: "gmail",
  }

  const name =
    input.secretName?.trim() ||
    defaultOAuthSecretName("Gmail", accountEmail)

  return upsertOAuthSecret({
    name,
    kind: "oauth_gmail",
    payload: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
      tokenType: tokens.token_type,
      scope: tokens.scope,
    },
    metadata,
  })
}
