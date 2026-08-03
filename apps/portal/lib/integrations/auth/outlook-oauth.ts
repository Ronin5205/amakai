import { createOAuthState } from "@/lib/data/secrets"
import { upsertOAuthSecret } from "@/lib/data/secrets"
import type { SecretMetadata } from "@/lib/domain/secret"
import { defaultOAuthSecretName } from "@/lib/validation/resource-names"

const OUTLOOK_SCOPES = [
  "openid",
  "profile",
  "email",
  "offline_access",
  "https://graph.microsoft.com/Mail.Send",
  "https://graph.microsoft.com/Mail.Read",
].join(" ")

function requireOutlookOAuthEnv() {
  const clientId = process.env.MICROSOFT_OAUTH_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_OAUTH_CLIENT_SECRET
  const tenant = process.env.MICROSOFT_OAUTH_TENANT ?? "common"
  const redirectUri =
    process.env.MICROSOFT_OAUTH_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3001"}/auth/integrations/outlook`

  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing MICROSOFT_OAUTH_CLIENT_ID / MICROSOFT_OAUTH_CLIENT_SECRET. Add them to apps/portal/.env.local"
    )
  }

  return { clientId, clientSecret, tenant, redirectUri }
}

export async function buildOutlookAuthorizeUrl(secretName?: string) {
  const { clientId, tenant, redirectUri } = requireOutlookOAuthEnv()
  const state = await createOAuthState({
    provider: "outlook",
    secretName,
    redirectPath: "/resources/secrets",
  })

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: OUTLOOK_SCOPES,
    state,
  })

  return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`
}

export async function exchangeOutlookCode(code: string) {
  const { clientId, clientSecret, tenant, redirectUri } =
    requireOutlookOAuthEnv()

  const response = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Outlook token exchange failed: ${text}`)
  }

  return (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    token_type?: string
    scope?: string
  }
}

export async function refreshOutlookAccessToken(refreshToken: string) {
  const { clientId, clientSecret, tenant } = requireOutlookOAuthEnv()

  const response = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Outlook token refresh failed: ${text}`)
  }

  return (await response.json()) as {
    access_token: string
    refresh_token?: string
    expires_in?: number
    token_type?: string
    scope?: string
  }
}

export async function fetchOutlookUserEmail(accessToken: string) {
  const response = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    return undefined
  }

  const json = (await response.json()) as {
    mail?: string
    userPrincipalName?: string
  }
  return json.mail || json.userPrincipalName
}

export async function saveOutlookOAuthSecret(input: {
  code: string
  secretName?: string
}) {
  const tokens = await exchangeOutlookCode(input.code)
  const accountEmail = await fetchOutlookUserEmail(tokens.access_token)
  const expiresAt =
    typeof tokens.expires_in === "number"
      ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
      : undefined

  const metadata: SecretMetadata = {
    accountEmail,
    scopes: tokens.scope?.split(" ").filter(Boolean),
    expiresAt,
    refreshStatus: "ok",
    provider: "outlook",
  }

  const name =
    input.secretName?.trim() ||
    defaultOAuthSecretName("Outlook", accountEmail)

  return upsertOAuthSecret({
    name,
    kind: "oauth_outlook",
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
