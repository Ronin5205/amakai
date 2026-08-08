import { NextResponse } from "next/server"

import {
  findSubscriptionsByAccountEmail,
  updateSubscriptionHistoryId,
  listNewGmailMessages,
  registerGmailWatch,
  buildEmailPayload,
} from "@/lib/triggers"
import { enqueueAndProcessInboundRun } from "@/lib/data/inbound-runs"
import { createAdminClient } from "@/utils/supabase/admin"
import { getSecretPayloadForUser } from "@/lib/data/secrets"
import type { OAuthTokenPayload, SecretMetadata } from "@/lib/domain/secret"
import { ensureFreshOAuthToken } from "@/lib/integrations/auth/token-refresh"
import { normalizeGmailMessage } from "@/lib/integrations/email/adapters"

type PubSubPushBody = {
  message?: {
    data?: string
    messageId?: string
  }
}

/**
 * Google Pub/Sub push endpoint for Gmail users.watch notifications.
 * Configure the push subscription to POST here.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PubSubPushBody
    const encoded = body.message?.data
    if (!encoded) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const decoded = JSON.parse(
      Buffer.from(encoded, "base64").toString("utf8")
    ) as { emailAddress?: string; historyId?: string | number }

    const emailAddress = decoded.emailAddress
    const historyId = decoded.historyId ? String(decoded.historyId) : ""
    if (!emailAddress) {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const subscriptions = await findSubscriptionsByAccountEmail(
      "gmail",
      emailAddress
    )
    if (subscriptions.length === 0) {
      return NextResponse.json({ ok: true, matched: 0 })
    }

    const supabase = createAdminClient()
    const topic = process.env.GMAIL_PUBSUB_TOPIC

    for (const subscription of subscriptions) {
      const secretName = String(subscription.metadata?.secretName ?? "")
      if (!secretName) {
        console.error(
          "[gmail/push] Subscription missing secretName:",
          subscription.id
        )
        continue
      }

      const secret = await getSecretPayloadForUser(
        supabase,
        subscription.user_id,
        secretName
      )
      if (!secret) {
        console.error(
          "[gmail/push] Secret not found for subscription:",
          subscription.id
        )
        continue
      }

      const tokens = await ensureFreshOAuthToken({
        provider: "gmail",
        payload: secret.payload as OAuthTokenPayload,
        secretId: secret.rowId,
        metadata: secret.secret.metadata as SecretMetadata,
        admin: { supabase, userId: subscription.user_id },
      })

      const startHistoryId = subscription.last_history_id
      const messages = await listNewGmailMessages(
        tokens.accessToken,
        startHistoryId,
        {
          subscriptionId: subscription.id,
          reRegisterWatch: topic
            ? () => registerGmailWatch(tokens.accessToken, topic)
            : undefined,
        }
      )

      const { data: workflow } = await supabase
        .from("workflows")
        .select("name")
        .eq("id", subscription.workflow_id)
        .maybeSingle()

      for (const message of messages) {
        const normalized = await normalizeGmailMessage(
          message as Parameters<typeof normalizeGmailMessage>[0]
        )
        await enqueueAndProcessInboundRun({
          userId: subscription.user_id,
          workflowId: subscription.workflow_id,
          workflowName: workflow?.name ?? "Workflow",
          triggerLabel: "email",
          triggerNodeId: subscription.trigger_node_id,
          payload: buildEmailPayload(normalized, "gmail"),
          eventKey: normalized.messageId
            ? `gmail:${normalized.messageId}`
            : undefined,
        })
      }

      if (historyId) {
        await updateSubscriptionHistoryId(subscription.id, historyId)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[gmail/push] Handler failed:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gmail push handling failed",
      },
      { status: 500 }
    )
  }
}
