import "server-only"

import { createHash } from "crypto"

import {
  decryptSecretPayload,
  encryptSecretPayload,
} from "@/lib/integrations/crypto"

type StripeIdPayload = {
  v: 1
  id: string
}

export function hashStripeId(id: string): string {
  return createHash("sha256").update(`stripe:${id}`).digest("hex")
}

export function encryptStripeId(id: string): string {
  return encryptSecretPayload({ v: 1, id } satisfies StripeIdPayload)
}

export function decryptStripeId(encrypted: string): string {
  const payload = decryptSecretPayload<StripeIdPayload>(encrypted)
  if (!payload || payload.v !== 1 || typeof payload.id !== "string" || !payload.id) {
    throw new Error("Invalid encrypted Stripe identifier.")
  }
  return payload.id
}
