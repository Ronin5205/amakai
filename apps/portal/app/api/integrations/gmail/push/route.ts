import { NextResponse } from "next/server"

import {
  findSubscriptionsByAccountEmail,
  updateSubscriptionHistoryId,
} from "@/lib/data/trigger-subscriptions"
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

    for (const subscription of subscriptions) {
      const secretName = String(subscription.metadata?.secretName ?? "")
      if (!secretName) {
        continue
      }

      const secret = await getSecretPayloadForUser(
        supabase,
        subscription.user_id,
        secretName
      )
      if (!secret) {
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
        startHistoryId
      )

      const { data: workflow } = await supabase
        .from("workflows")
        .select("name")
        .eq("id", subscription.workflow_id)
        .maybeSingle()

      for (const message of messages) {
        const normalized = await normalizeGmailMessage(message)
        await enqueueAndProcessInboundRun({
          userId: subscription.user_id,
          workflowId: subscription.workflow_id,
          workflowName: workflow?.name ?? "Workflow",
          triggerLabel: "email",
          triggerNodeId: subscription.trigger_node_id,
          payload: {
            ...normalized,
            triggerType: "email",
            provider: "gmail",
            triggeredAt: new Date().toISOString(),
          },
          eventKey: normalized.messageId
            ? `gmail:${normalized.messageId}`
            : undefined,
        })
      }

      if (historyId) {
        await updateSubscriptionHistoryId(subscription.id, historyId)
      }
    }

    // Pub/Sub expects 2xx quickly
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gmail push handling failed",
      },
      { status: 500 }
    )
  }
}

async function listNewGmailMessages(
  accessToken: string,
  startHistoryId: string | null
) {
  if (!startHistoryId) {
    // Fallback: fetch the latest inbox message
    const list = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&labelIds=INBOX",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!list.ok) {
      return []
    }
    const json = (await list.json()) as {
      messages?: Array<{ id: string }>
    }
    const id = json.messages?.[0]?.id
    if (!id) {
      return []
    }
    const detail = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!detail.ok) {
      return []
    }
    return [await detail.json()]
  }

  const history = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${encodeURIComponent(startHistoryId)}&historyTypes=messageAdded`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!history.ok) {
    return []
  }

  const json = (await history.json()) as {
    history?: Array<{
      messagesAdded?: Array<{ message?: { id?: string } }>
    }>
  }

  const ids = new Set<string>()
  for (const entry of json.history ?? []) {
    for (const added of entry.messagesAdded ?? []) {
      if (added.message?.id) {
        ids.add(added.message.id)
      }
    }
  }

  const messages = []
  for (const id of ids) {
    const detail = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=full`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (detail.ok) {
      messages.push(await detail.json())
    }
  }
  return messages
}
