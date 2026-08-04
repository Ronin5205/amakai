import { NextResponse } from "next/server"

import { processStripeWebhook } from "@/lib/stripe"

export const runtime = "nodejs"

/**
 * Sole HTTP ingress for Stripe → Amakai.
 * Always verifies signatures; returns 5xx on retryable failures so Stripe
 * redelivers and entitlements are not lost after a successful charge.
 */
export async function POST(request: Request) {
  const signatureHeader = request.headers.get("stripe-signature")
  const rawBody = await request.text()

  const result = await processStripeWebhook({
    rawBody,
    signatureHeader,
  })

  if (result.ok) {
    return NextResponse.json({ received: true })
  }

  // Do not include internal details beyond a stable error code in responses.
  if (result.retryable) {
    return NextResponse.json({ error: "processing_failed" }, { status: 503 })
  }

  return NextResponse.json({ error: "invalid_request" }, { status: 400 })
}
