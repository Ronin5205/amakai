import { NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"

import { findSubscriptionByWebhookToken } from "@/lib/data/trigger-subscriptions"
import { enqueueAndProcessInboundRun } from "@/lib/data/inbound-runs"
import { createAdminClient } from "@/utils/supabase/admin"
import { getSecretPayloadForUser } from "@/lib/data/secrets"
import type { WebhookSigningPayload } from "@/lib/domain/secret"

async function readBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? ""
  if (contentType.includes("application/json")) {
    try {
      return await request.json()
    } catch {
      return {}
    }
  }
  const text = await request.text()
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { raw: text }
  }
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) {
    return false
  }
  return timingSafeEqual(left, right)
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 })
  }

  try {
    const subscription = await findSubscriptionByWebhookToken(token)
    if (!subscription) {
      return NextResponse.json({ error: "Unknown webhook" }, { status: 404 })
    }

    const authMode = String(subscription.metadata?.authMode ?? "none")
    const body = await readBody(request)

    if (authMode === "secret") {
      const secretName = String(subscription.metadata?.secretName ?? "")
      if (!secretName) {
        return NextResponse.json(
          { error: "Webhook signing secret is not configured." },
          { status: 401 }
        )
      }
      const supabase = createAdminClient()
      const secret = await getSecretPayloadForUser(
        supabase,
        subscription.user_id,
        secretName
      )
      if (!secret) {
        return NextResponse.json({ error: "Secret not found" }, { status: 401 })
      }
      const signing = secret.payload as WebhookSigningPayload
      const expected = typeof signing.secret === "string" ? signing.secret : ""
      const provided =
        request.headers.get("x-amakai-signature") ??
        request.headers.get("x-hub-signature-256") ??
        ""

      const rawBody =
        typeof body === "string" ? body : JSON.stringify(body ?? {})
      const digest = `sha256=${createHmac("sha256", expected)
        .update(rawBody)
        .digest("hex")}`

      if (
        !provided ||
        (!safeEqual(provided, expected) && !safeEqual(provided, digest))
      ) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
      }
    }

    if (authMode === "public") {
      const expected = String(subscription.metadata?.publicApiKey ?? "")
      const provided = request.headers.get("x-amakai-key") ?? ""
      if (!expected || !safeEqual(provided, expected)) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
    }

    const supabase = createAdminClient()
    const { data: workflow } = await supabase
      .from("workflows")
      .select("name")
      .eq("id", subscription.workflow_id)
      .maybeSingle()

    const payload =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : { payload: body }

    const idempotency =
      request.headers.get("idempotency-key") ??
      request.headers.get("x-request-id") ??
      undefined

    const result = await enqueueAndProcessInboundRun({
      userId: subscription.user_id,
      workflowId: subscription.workflow_id,
      workflowName: workflow?.name ?? "Workflow",
      triggerLabel: subscription.operation || "webhook",
      triggerNodeId: subscription.trigger_node_id,
      payload: {
        ...payload,
        triggeredAt: new Date().toISOString(),
        triggerType: subscription.operation || "webhook",
      },
      eventKey: idempotency ? `webhook:${idempotency}` : undefined,
    })

    return NextResponse.json({
      ok: true,
      executionId: result.executionId,
      status: result.status,
    })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Webhook handling failed",
      },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  const subscription = await findSubscriptionByWebhookToken(token)
  if (!subscription) {
    return NextResponse.json({ error: "Unknown webhook" }, { status: 404 })
  }
  return NextResponse.json({
    ok: true,
    provider: subscription.provider,
    operation: subscription.operation,
    status: subscription.status,
  })
}
