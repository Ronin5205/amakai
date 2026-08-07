import { createHash, randomBytes } from "node:crypto"

import type { DestructiveConfirmation } from "@/lib/domain/ai"

const pending = new Map<
  string,
  {
    userId: string
    toolName: string
    payload: Record<string, unknown>
    expiresAt: number
  }
>()

const TTL_MS = 10 * 60 * 1000

function prune() {
  const now = Date.now()
  for (const [id, entry] of pending) {
    if (entry.expiresAt <= now) {
      pending.delete(id)
    }
  }
}

export function createConfirmationRequest(input: {
  userId: string
  toolName: string
  summary: string
  payload: Record<string, unknown>
}): DestructiveConfirmation {
  prune()
  const confirmationId = randomBytes(16).toString("hex")
  pending.set(confirmationId, {
    userId: input.userId,
    toolName: input.toolName,
    payload: input.payload,
    expiresAt: Date.now() + TTL_MS,
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
  prune()
  const entry = pending.get(input.confirmationId)
  if (!entry) return null
  if (entry.userId !== input.userId) return null
  if (entry.toolName !== input.toolName) return null
  pending.delete(input.confirmationId)
  return entry.payload
}

export function hashConfirmationPayload(
  payload: Record<string, unknown>
): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex")
}
