export const SECRET_KINDS = [
  "oauth_gmail",
  "oauth_outlook",
  "api_key",
  "smtp",
  "webhook_signing",
  "bearer_token",
] as const

export type SecretKind = (typeof SECRET_KINDS)[number]

export type SecretMetadata = {
  accountEmail?: string
  scopes?: string[]
  expiresAt?: string
  refreshStatus?: "ok" | "expired" | "revoked" | "unknown"
  provider?: string
  [key: string]: unknown
}

/** Client-safe secret summary — never includes decrypted payload. */
export type SecretSummary = {
  id: string
  name: string
  kind: SecretKind
  accountEmail?: string
  refreshStatus?: SecretMetadata["refreshStatus"]
  updatedAt: string
  createdAt: string
}

export type Secret = SecretSummary & {
  metadata: SecretMetadata
}

export type OAuthTokenPayload = {
  accessToken: string
  refreshToken?: string
  expiresAt?: string
  tokenType?: string
  scope?: string
}

export type ApiKeyPayload = {
  apiKey: string
  headerName?: string
}

export type WebhookSigningPayload = {
  secret: string
}

export type SecretPayload =
  | OAuthTokenPayload
  | ApiKeyPayload
  | WebhookSigningPayload
  | Record<string, unknown>

export function isSecretKind(value: string): value is SecretKind {
  return (SECRET_KINDS as readonly string[]).includes(value)
}

export function secretKindLabel(kind: SecretKind): string {
  switch (kind) {
    case "oauth_gmail":
      return "Gmail (OAuth)"
    case "oauth_outlook":
      return "Outlook (OAuth)"
    case "api_key":
      return "API key"
    case "smtp":
      return "SMTP"
    case "webhook_signing":
      return "Webhook signing"
    case "bearer_token":
      return "Bearer token"
    default:
      return kind
  }
}

export function findSecretSummary(
  secrets: SecretSummary[],
  secretName: string
) {
  const normalized = secretName.trim().toLowerCase()
  return secrets.find((secret) => secret.name.trim().toLowerCase() === normalized)
}
