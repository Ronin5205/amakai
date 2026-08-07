import { createHmac, timingSafeEqual } from "node:crypto"

import type { DestructiveConfirmation } from "@/lib/domain/ai"

const TTL_MS = 10 * 60 * 1000

export type SignedConfirmation = {
  userId: string
  toolName: string
  payload: Record<string, unknown>
  exp: number
}

function getConfirmationSecret(): string {
  return (
    process.env.AI_CONFIRMATION_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    "amakai-dev-confirmation-secret"
  )
}

function signConfirmation(data: SignedConfirmation): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url")
  const signature = createHmac("sha256", getConfirmationSecret())
    .update(payload)
    .digest("base64url")
  return `${payload}.${signature}`
}

export function peekConfirmation(
  confirmationId: string
): SignedConfirmation | null {
  const [payload, signature] = confirmationId.split(".")
  if (!payload || !signature) {
    return null
  }

  const expected = createHmac("sha256", getConfirmationSecret())
    .update(payload)
    .digest("base64url")

  try {
    const sigBuf = Buffer.from(signature)
    const expectedBuf = Buffer.from(expected)
    if (
      sigBuf.length !== expectedBuf.length ||
      !timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return null
    }
  } catch {
    return null
  }

  try {
    const data = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as SignedConfirmation
    if (!data?.userId || !data?.toolName || !data?.exp) {
      return null
    }
    if (data.exp <= Date.now()) {
      return null
    }
    return data
  } catch {
    return null
  }
}

export function createConfirmationRequest(input: {
  userId: string
  toolName: string
  summary: string
  payload: Record<string, unknown>
}): DestructiveConfirmation {
  const confirmationId = signConfirmation({
    userId: input.userId,
    toolName: input.toolName,
    payload: input.payload,
    exp: Date.now() + TTL_MS,
  })

  return {
    requiresConfirmation: true,
    confirmationId,
    toolName: input.toolName,
    summary: input.summary,
    payload: input.payload,
  }
}

export function consumeConfirmation(input: {
  userId: string
  confirmationId: string
  toolName: string
}): Record<string, unknown> | null {
  const entry = peekConfirmation(input.confirmationId)
  if (!entry) return null
  if (entry.userId !== input.userId) return null
  if (entry.toolName !== input.toolName) return null
  return entry.payload
}
