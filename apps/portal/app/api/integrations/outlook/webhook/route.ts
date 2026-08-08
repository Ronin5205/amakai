import { NextResponse } from "next/server"

import { createAdminClient } from "@/utils/supabase/admin"
import { enqueueAndProcessInboundRun } from "@/lib/data/inbound-runs"
import { getSecretPayloadForUser } from "@/lib/data/secrets"
import type { OAuthTokenPayload, SecretMetadata } from "@/lib/domain/secret"
import { ensureFreshOAuthToken } from "@/lib/integrations/auth/token-refresh"
import { normalizeOutlookMessage } from "@/lib/integrations/email/adapters"
import { buildEmailPayload } from "@/lib/triggers"
import type { TriggerSubscriptionRow } from "@/lib/triggers"

type GraphNotification = {
  subscriptionId?: string
  clientState?: string
  resourceData?: { id?: string }
  resource?: string
}

/**
 * Microsoft Graph change notification endpoint for Outlook mail.
 * Supports validation handshake (?validationToken=) and notification POSTs.
 */
export async function POST(request: Request) {
  const { searchParams } = new URL(request.url)
  const validationToken = searchParams.get("validationToken")
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  }

  try {
    const body = (await request.json()) as {
      value?: GraphNotification[]
    }
    const notifications = body.value ?? []
    if (notifications.length === 0) {
      return NextResponse.json({ ok: true })
    }

    const supabase = createAdminClient()

    for (const notification of notifications) {
      if (!notification.subscriptionId) {
        continue
      }

      const { data: subscription } = await supabase
        .from("workflow_trigger_subscriptions")
        .select("*")
        .eq("subscription_ref", notification.subscriptionId)
        .eq("provider", "outlook")
        .eq("status", "active")
        .maybeSingle()

      if (!subscription) {
        continue
      }

      const row = subscription as TriggerSubscriptionRow
      const expectedClientState = String(row.metadata?.clientState ?? "")
      if (
        expectedClientState &&
        notification.clientState &&
        notification.clientState !== expectedClientState
      ) {
        continue
      }

      const secretName = String(row.metadata?.secretName ?? "")
      if (!secretName) {
        console.error(
          "[outlook/webhook] Subscription missing secretName:",
          row.id
        )
        continue
      }

      const secret = await getSecretPayloadForUser(
        supabase,
        row.user_id,
        secretName
      )
      if (!secret) {
        console.error("[outlook/webhook] Secret not found:", row.id)
        continue
      }

      const tokens = await ensureFreshOAuthToken({
        provider: "outlook",
        payload: secret.payload as OAuthTokenPayload,
        secretId: secret.rowId,
        metadata: secret.secret.metadata as SecretMetadata,
        admin: { supabase, userId: row.user_id },
      })

      const messageId = notification.resourceData?.id
      if (!messageId) {
        continue
      }

      const detail = await fetch(
        `https://graph.microsoft.com/v1.0/me/messages/${messageId}`,
        { headers: { Authorization: `Bearer ${tokens.accessToken}` } }
      )
      if (!detail.ok) {
        console.error(
          "[outlook/webhook] Failed to fetch message:",
          detail.status,
          await detail.text()
        )
        continue
      }

      const message = await detail.json()
      const normalized = await normalizeOutlookMessage(message)

      const { data: workflow } = await supabase
        .from("workflows")
        .select("name")
        .eq("id", row.workflow_id)
        .maybeSingle()

      await enqueueAndProcessInboundRun({
        userId: row.user_id,
        workflowId: row.workflow_id,
        workflowName: workflow?.name ?? "Workflow",
        triggerLabel: "email",
        triggerNodeId: row.trigger_node_id,
        payload: buildEmailPayload(normalized, "outlook"),
        eventKey: normalized.messageId
          ? `outlook:${normalized.messageId}`
          : undefined,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[outlook/webhook] Handler failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Outlook webhook handling failed",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const validationToken = searchParams.get("validationToken")
  if (validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })
  }
  return NextResponse.json({ ok: true, provider: "outlook" })
}
