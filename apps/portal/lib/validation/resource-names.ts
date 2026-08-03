import { z } from "zod"

import {
  RESOURCE_DESCRIPTION_MAX_LENGTH,
  RESOURCE_NAME_MAX_LENGTH,
  RESOURCE_NAME_MIN_LENGTH,
  RESOURCE_NAME_PATTERN,
} from "@/lib/validation/limits"
import { formatZodError } from "@/lib/validation/zod-helpers"

const resourceNameSchema = z
  .string()
  .trim()
  .min(
    RESOURCE_NAME_MIN_LENGTH,
    `Name must be at least ${RESOURCE_NAME_MIN_LENGTH} character.`
  )
  .max(
    RESOURCE_NAME_MAX_LENGTH,
    `Name must be at most ${RESOURCE_NAME_MAX_LENGTH} characters.`
  )
  .regex(
    RESOURCE_NAME_PATTERN,
    "Name must start with a letter or number and may only contain letters, numbers, spaces, and . - _ ( ) &."
  )

const optionalDescriptionSchema = z
  .string()
  .max(
    RESOURCE_DESCRIPTION_MAX_LENGTH,
    `Description must be at most ${RESOURCE_DESCRIPTION_MAX_LENGTH} characters.`
  )
  .optional()

export function parseResourceName(
  name: string,
  fallback: string
): { ok: true; name: string } | { ok: false; error: string } {
  const trimmed = name.trim()
  const candidate = trimmed.length > 0 ? trimmed : fallback
  const result = resourceNameSchema.safeParse(candidate)

  if (!result.success) {
    return { ok: false, error: formatZodError(result.error) }
  }

  return { ok: true, name: result.data }
}

export function parseOptionalDescription(
  description: string | undefined
): { ok: true; description: string | null } | { ok: false; error: string } {
  const normalized = description?.trim() ?? ""
  if (normalized.length === 0) {
    return { ok: true, description: null }
  }

  const result = optionalDescriptionSchema.safeParse(normalized)
  if (!result.success) {
    return { ok: false, error: formatZodError(result.error) }
  }

  return { ok: true, description: result.data ?? null }
}

export function normalizeValidatedResourceName(name: string, fallback: string) {
  const parsed = parseResourceName(name, fallback)
  if (!parsed.ok) {
    throw new Error(parsed.error)
  }
  return parsed.name
}

/** Default secret name after OAuth connect — email lives in metadata, not the name. */
export function defaultOAuthSecretName(
  provider: "Gmail" | "Outlook",
  accountEmail?: string
): string {
  const fallback = `${provider} account`

  if (!accountEmail?.trim()) {
    return fallback
  }

  const localPart = accountEmail.split("@")[0]?.trim() ?? ""
  const sanitized = localPart
    .replace(/[^a-zA-Z0-9\s.\-_()&]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")

  if (!sanitized) {
    return fallback
  }

  const prefix = `${provider} `
  const maxLocalLength = Math.max(
    1,
    RESOURCE_NAME_MAX_LENGTH - prefix.length
  )
  const candidate = `${prefix}${sanitized.slice(0, maxLocalLength)}`.trim()
  const parsed = parseResourceName(candidate, fallback)
  return parsed.ok ? parsed.name : fallback
}

export { resourceNameSchema, optionalDescriptionSchema }
