import type { OAuthTokenPayload, SecretMetadata } from "@/lib/domain/secret"
import {
  refreshGmailAccessToken,
} from "@/lib/integrations/auth/gmail-oauth"
import {
  refreshOutlookAccessToken,
} from "@/lib/integrations/auth/outlook-oauth"
import {
  updateSecretEncryptedPayload,
  updateSecretEncryptedPayloadAsAdmin,
} from "@/lib/data/secrets"
import type { createAdminClient } from "@/utils/supabase/admin"

function isExpired(expiresAt?: string, skewMs = 60_000) {
  if (!expiresAt) {
    return false
  }
  return new Date(expiresAt).getTime() <= Date.now() + skewMs
}

export async function ensureFreshOAuthToken(input: {
  provider: "gmail" | "outlook"
  payload: OAuthTokenPayload
  secretId?: string
  metadata?: SecretMetadata
  /** When set, persists refreshed tokens via admin client (inbound handlers). */
  admin?: {
    supabase: ReturnType<typeof createAdminClient>
    userId: string
  }
}): Promise<OAuthTokenPayload> {
  if (!isExpired(input.payload.expiresAt)) {
    return input.payload
  }

  if (!input.payload.refreshToken) {
    throw new Error(
      `${input.provider} access token expired and no refresh token is stored. Reconnect the account in Resources → Secrets.`
    )
  }

  const refreshed =
    input.provider === "gmail"
      ? await refreshGmailAccessToken(input.payload.refreshToken)
      : await refreshOutlookAccessToken(input.payload.refreshToken)

  const expiresAt =
    typeof refreshed.expires_in === "number"
      ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
      : undefined

  const nextPayload: OAuthTokenPayload = {
    accessToken: refreshed.access_token,
    refreshToken:
      ("refresh_token" in refreshed &&
      typeof refreshed.refresh_token === "string"
        ? refreshed.refresh_token
        : undefined) ?? input.payload.refreshToken,
    expiresAt,
    tokenType: refreshed.token_type ?? input.payload.tokenType,
    scope: refreshed.scope ?? input.payload.scope,
  }

  const nextMetadata: SecretMetadata = {
    ...(input.metadata ?? {}),
    expiresAt,
    refreshStatus: "ok",
  }

  if (input.secretId) {
    if (input.admin) {
      await updateSecretEncryptedPayloadAsAdmin(
        input.admin.supabase,
        input.secretId,
        input.admin.userId,
        nextPayload,
        nextMetadata
      )
    } else {
      await updateSecretEncryptedPayload(
        input.secretId,
        nextPayload,
        nextMetadata
      )
    }
  }

  return nextPayload
}
