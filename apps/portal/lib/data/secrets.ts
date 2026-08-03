import type {
  Secret,
  SecretKind,
  SecretMetadata,
  SecretPayload,
  SecretSummary,
} from "@/lib/domain/secret"
import { isSecretKind } from "@/lib/domain/secret"
import {
  decryptSecretPayload,
  encryptSecretPayload,
} from "@/lib/integrations/crypto"
import {
  normalizeValidatedResourceName,
  parseResourceName,
} from "@/lib/validation/resource-names"
import { createClient } from "@/utils/supabase/server"

export type SecretRowDb = {
  id: string
  user_id: string
  name: string
  kind: string
  encrypted_payload: string
  metadata: Record<string, unknown> | null
  updated_at: string
  created_at: string
}

async function getAuthenticatedUserId() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return { supabase, userId: user.id }
}

function mapMetadata(raw: Record<string, unknown> | null): SecretMetadata {
  if (!raw || typeof raw !== "object") {
    return {}
  }
  return raw as SecretMetadata
}

function mapSecretSummary(row: SecretRowDb): SecretSummary {
  const metadata = mapMetadata(row.metadata)
  const kind = isSecretKind(row.kind) ? row.kind : ("api_key" as SecretKind)

  return {
    id: row.id,
    name: row.name,
    kind,
    accountEmail:
      typeof metadata.accountEmail === "string"
        ? metadata.accountEmail
        : undefined,
    refreshStatus:
      metadata.refreshStatus === "ok" ||
      metadata.refreshStatus === "expired" ||
      metadata.refreshStatus === "revoked" ||
      metadata.refreshStatus === "unknown"
        ? metadata.refreshStatus
        : undefined,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }
}

function mapSecret(row: SecretRowDb): Secret {
  return {
    ...mapSecretSummary(row),
    metadata: mapMetadata(row.metadata),
  }
}

function normalizeSecretName(name: string) {
  return normalizeValidatedResourceName(name, "Untitled secret")
}

async function assertUniqueSecretName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
  excludeId?: string
) {
  const normalizedName = normalizeSecretName(name)

  let query = supabase
    .from("secrets")
    .select("id, name")
    .eq("user_id", userId)

  if (excludeId) {
    query = query.neq("id", excludeId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message ?? "Failed to validate secret name.")
  }

  const duplicate = (data ?? []).find(
    (row) => row.name.trim().toLowerCase() === normalizedName.toLowerCase()
  )

  if (duplicate) {
    throw new Error(`A secret named "${duplicate.name}" already exists.`)
  }
}

export async function listSecrets(): Promise<Secret[]> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return []
  }

  const { data, error } = await auth.supabase
    .from("secrets")
    .select("id, user_id, name, kind, encrypted_payload, metadata, updated_at, created_at")
    .eq("user_id", auth.userId)
    .order("updated_at", { ascending: false })

  if (error || !data) {
    return []
  }

  return (data as SecretRowDb[]).map(mapSecret)
}

export async function listSecretSummaries(
  kinds?: SecretKind[]
): Promise<SecretSummary[]> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return []
  }

  let query = auth.supabase
    .from("secrets")
    .select("id, user_id, name, kind, encrypted_payload, metadata, updated_at, created_at")
    .eq("user_id", auth.userId)
    .order("name", { ascending: true })

  if (kinds && kinds.length > 0) {
    query = query.in("kind", kinds)
  }

  const { data, error } = await query

  if (error || !data) {
    return []
  }

  return (data as SecretRowDb[]).map(mapSecretSummary)
}

export async function getSecretByName(
  name: string
): Promise<(Secret & { payload: SecretPayload }) | null> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return null
  }

  const normalized = name.trim().toLowerCase()
  const { data, error } = await auth.supabase
    .from("secrets")
    .select("*")
    .eq("user_id", auth.userId)

  if (error || !data) {
    return null
  }

  const row = (data as SecretRowDb[]).find(
    (entry) => entry.name.trim().toLowerCase() === normalized
  )

  if (!row) {
    return null
  }

  return {
    ...mapSecret(row),
    payload: decryptSecretPayload<SecretPayload>(row.encrypted_payload),
  }
}

export async function getSecretById(
  id: string
): Promise<(Secret & { payload: SecretPayload }) | null> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return null
  }

  const { data, error } = await auth.supabase
    .from("secrets")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("id", id)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const row = data as SecretRowDb
  return {
    ...mapSecret(row),
    payload: decryptSecretPayload<SecretPayload>(row.encrypted_payload),
  }
}

export type CreateManualSecretInput = {
  name: string
  kind: SecretKind
  value: string
  metadata?: SecretMetadata
}

export async function createManualSecret(
  input: CreateManualSecretInput
): Promise<Secret> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to create secrets.")
  }

  const parsed = parseResourceName(input.name, "Untitled secret")
  if (!parsed.ok) {
    throw new Error(parsed.error)
  }

  if (!isSecretKind(input.kind)) {
    throw new Error("Invalid secret kind.")
  }

  if (
    input.kind === "oauth_gmail" ||
    input.kind === "oauth_outlook"
  ) {
    throw new Error("OAuth secrets must be created via Connect Gmail / Outlook.")
  }

  const value = input.value.trim()
  if (!value) {
    throw new Error("Secret value is required.")
  }

  await assertUniqueSecretName(auth.supabase, auth.userId, parsed.name)

  const payload =
    input.kind === "webhook_signing"
      ? { secret: value }
      : input.kind === "bearer_token"
        ? { apiKey: value, headerName: "Authorization" }
        : { apiKey: value }

  const encrypted = encryptSecretPayload(payload)

  const { data, error } = await auth.supabase
    .from("secrets")
    .insert({
      user_id: auth.userId,
      name: parsed.name,
      kind: input.kind,
      encrypted_payload: encrypted,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create secret.")
  }

  return mapSecret(data as SecretRowDb)
}

export type UpsertOAuthSecretInput = {
  name: string
  kind: "oauth_gmail" | "oauth_outlook"
  payload: {
    accessToken: string
    refreshToken?: string
    expiresAt?: string
    tokenType?: string
    scope?: string
  }
  metadata: SecretMetadata
}

export async function upsertOAuthSecret(
  input: UpsertOAuthSecretInput
): Promise<Secret> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to connect accounts.")
  }

  const parsed = parseResourceName(input.name, "Connected account")
  if (!parsed.ok) {
    throw new Error(parsed.error)
  }

  const encrypted = encryptSecretPayload(input.payload)
  const normalized = parsed.name.trim().toLowerCase()

  const { data: existingRows } = await auth.supabase
    .from("secrets")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("kind", input.kind)

  const existing = ((existingRows ?? []) as SecretRowDb[]).find(
    (row) => row.name.trim().toLowerCase() === normalized
  )

  if (existing) {
    const { data, error } = await auth.supabase
      .from("secrets")
      .update({
        encrypted_payload: encrypted,
        metadata: input.metadata,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .eq("user_id", auth.userId)
      .select("*")
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update OAuth secret.")
    }

    return mapSecret(data as SecretRowDb)
  }

  await assertUniqueSecretName(auth.supabase, auth.userId, parsed.name)

  const { data, error } = await auth.supabase
    .from("secrets")
    .insert({
      user_id: auth.userId,
      name: parsed.name,
      kind: input.kind,
      encrypted_payload: encrypted,
      metadata: input.metadata,
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save OAuth secret.")
  }

  return mapSecret(data as SecretRowDb)
}

/** Admin/service-role path: resolve secret by user id + name (inbound handlers). */
export async function getSecretPayloadForUser(
  supabase: ReturnType<typeof import("@/utils/supabase/admin").createAdminClient>,
  userId: string,
  name: string
): Promise<{
  secret: Secret
  payload: SecretPayload
  encryptedPayload: string
  rowId: string
} | null> {
  const normalized = name.trim().toLowerCase()
  const { data, error } = await supabase
    .from("secrets")
    .select("*")
    .eq("user_id", userId)

  if (error || !data) {
    return null
  }

  const row = (data as SecretRowDb[]).find(
    (entry) => entry.name.trim().toLowerCase() === normalized
  )

  if (!row) {
    return null
  }

  return {
    secret: mapSecret(row),
    payload: decryptSecretPayload<SecretPayload>(row.encrypted_payload),
    encryptedPayload: row.encrypted_payload,
    rowId: row.id,
  }
}

export async function updateSecretEncryptedPayload(
  secretId: string,
  payload: SecretPayload,
  metadata?: SecretMetadata
): Promise<void> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to update secrets.")
  }

  const encrypted = encryptSecretPayload(payload)
  const update: Record<string, unknown> = {
    encrypted_payload: encrypted,
    updated_at: new Date().toISOString(),
  }
  if (metadata) {
    update.metadata = metadata
  }

  const { error } = await auth.supabase
    .from("secrets")
    .update(update)
    .eq("id", secretId)
    .eq("user_id", auth.userId)

  if (error) {
    throw new Error(error.message ?? "Failed to update secret.")
  }
}

export async function updateSecretEncryptedPayloadAsAdmin(
  supabase: ReturnType<typeof import("@/utils/supabase/admin").createAdminClient>,
  secretId: string,
  userId: string,
  payload: SecretPayload,
  metadata?: SecretMetadata
): Promise<void> {
  const encrypted = encryptSecretPayload(payload)
  const update: Record<string, unknown> = {
    encrypted_payload: encrypted,
    updated_at: new Date().toISOString(),
  }
  if (metadata) {
    update.metadata = metadata
  }

  const { error } = await supabase
    .from("secrets")
    .update(update)
    .eq("id", secretId)
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message ?? "Failed to update secret.")
  }
}

export async function renameSecret(
  secretId: string,
  name: string
): Promise<Secret> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to rename secrets.")
  }

  const parsed = parseResourceName(name, "Untitled secret")
  if (!parsed.ok) {
    throw new Error(parsed.error)
  }

  await assertUniqueSecretName(auth.supabase, auth.userId, parsed.name, secretId)

  const { data, error } = await auth.supabase
    .from("secrets")
    .update({
      name: parsed.name,
      updated_at: new Date().toISOString(),
    })
    .eq("id", secretId)
    .eq("user_id", auth.userId)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to rename secret.")
  }

  return mapSecret(data as SecretRowDb)
}

export async function deleteSecret(secretId: string): Promise<void> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to delete secrets.")
  }

  const { error } = await auth.supabase
    .from("secrets")
    .delete()
    .eq("id", secretId)
    .eq("user_id", auth.userId)

  if (error) {
    throw new Error(error.message ?? "Failed to delete secret.")
  }
}

export async function countUserSecrets(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("secrets")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message ?? "Failed to count secrets.")
  }

  return count ?? 0
}

export async function deleteAllSecrets(): Promise<number> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to delete secrets.")
  }

  const count = await countUserSecrets(auth.supabase, auth.userId)

  const { error } = await auth.supabase
    .from("secrets")
    .delete()
    .eq("user_id", auth.userId)

  if (error) {
    throw new Error(error.message ?? "Failed to delete secrets.")
  }

  return count
}

export async function createOAuthState(input: {
  provider: "gmail" | "outlook"
  secretName?: string
  redirectPath?: string
}): Promise<string> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to connect accounts.")
  }

  const state = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  // Clean expired states for this user
  await auth.supabase
    .from("oauth_states")
    .delete()
    .eq("user_id", auth.userId)
    .lt("expires_at", new Date().toISOString())

  const { error } = await auth.supabase.from("oauth_states").insert({
    user_id: auth.userId,
    provider: input.provider,
    state,
    secret_name: input.secretName ?? null,
    redirect_path: input.redirectPath ?? "/resources/secrets",
    expires_at: expiresAt,
  })

  if (error) {
    throw new Error(error.message ?? "Failed to start OAuth flow.")
  }

  return state
}

export async function consumeOAuthState(state: string): Promise<{
  userId: string
  provider: "gmail" | "outlook"
  secretName?: string
  redirectPath: string
} | null> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return null
  }

  const { data, error } = await auth.supabase
    .from("oauth_states")
    .select("*")
    .eq("state", state)
    .eq("user_id", auth.userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  await auth.supabase.from("oauth_states").delete().eq("id", data.id)

  if (new Date(data.expires_at).getTime() < Date.now()) {
    return null
  }

  return {
    userId: data.user_id,
    provider: data.provider as "gmail" | "outlook",
    secretName: data.secret_name ?? undefined,
    redirectPath: data.redirect_path || "/resources/secrets",
  }
}
