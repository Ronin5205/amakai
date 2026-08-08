import { createAdminClient } from "@/utils/supabase/admin"
import type {
  GmailWatchResult,
  TriggerSubscriptionRow,
} from "@/lib/triggers/types"

export async function registerGmailWatch(
  accessToken: string,
  topicName: string
): Promise<GmailWatchResult> {
  const response = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/watch",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        topicName,
        labelIds: ["INBOX"],
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Gmail watch failed: ${text}`)
  }

  return (await response.json()) as GmailWatchResult
}

async function fetchLatestInboxMessage(accessToken: string) {
  const list = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=1&labelIds=INBOX",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!list.ok) {
    console.error(
      "[gmail] Failed to list inbox messages:",
      list.status,
      await list.text()
    )
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
    console.error(
      "[gmail] Failed to fetch message:",
      detail.status,
      await detail.text()
    )
    return []
  }
  return [await detail.json()]
}

/**
 * List new Gmail messages since startHistoryId.
 * On stale historyId (404), resets last_history_id, optionally re-registers watch,
 * and falls back to the latest INBOX message.
 */
export async function listNewGmailMessages(
  accessToken: string,
  startHistoryId: string | null,
  options?: {
    subscriptionId?: string
    reRegisterWatch?: () => Promise<GmailWatchResult | null>
  }
): Promise<unknown[]> {
  if (!startHistoryId) {
    return fetchLatestInboxMessage(accessToken)
  }

  const history = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/history?startHistoryId=${encodeURIComponent(startHistoryId)}&historyTypes=messageAdded`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!history.ok) {
    const text = await history.text()
    console.error(
      "[gmail] History API failed:",
      history.status,
      text.slice(0, 500)
    )

    // Stale historyId — reset and fall back so the next push can recover.
    if (history.status === 404 && options?.subscriptionId) {
      const supabase = createAdminClient()
      await supabase
        .from("workflow_trigger_subscriptions")
        .update({
          last_history_id: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", options.subscriptionId)

      if (options.reRegisterWatch) {
        try {
          const watch = await options.reRegisterWatch()
          if (watch?.historyId) {
            await supabase
              .from("workflow_trigger_subscriptions")
              .update({
                last_history_id: watch.historyId,
                subscription_ref: watch.historyId,
                expires_at: watch.expiration
                  ? new Date(Number(watch.expiration)).toISOString()
                  : null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", options.subscriptionId)
          }
        } catch (error) {
          console.error("[gmail] Failed to re-register watch after 404:", error)
        }
      }

      return fetchLatestInboxMessage(accessToken)
    }

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
    } else {
      console.error(
        "[gmail] Failed to fetch message",
        id,
        detail.status,
        await detail.text()
      )
    }
  }
  return messages
}

export async function renewGmailWatch(
  accessToken: string,
  topicName: string
): Promise<GmailWatchResult> {
  return registerGmailWatch(accessToken, topicName)
}

export function parseGmailWatchExpiry(watch: GmailWatchResult): {
  subscriptionRef: string | null
  lastHistoryId: string | null
  expiresAt: string | null
} {
  return {
    subscriptionRef: watch.historyId ?? null,
    lastHistoryId: watch.historyId ?? null,
    expiresAt: watch.expiration
      ? new Date(Number(watch.expiration)).toISOString()
      : null,
  }
}

export async function updateSubscriptionHistoryId(
  subscriptionId: string,
  historyId: string
) {
  const supabase = createAdminClient()
  await supabase
    .from("workflow_trigger_subscriptions")
    .update({
      last_history_id: historyId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId)
}

/** Active Gmail receive subscriptions only (excludes pending_setup). */
export async function findActiveGmailSubscriptionsByEmail(
  accountEmail: string
): Promise<TriggerSubscriptionRow[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("workflow_trigger_subscriptions")
    .select("*")
    .eq("provider", "gmail")
    .eq("account_email", accountEmail)
    .eq("operation", "receive")
    .eq("status", "active")

  if (error || !data) {
    return []
  }

  return data as TriggerSubscriptionRow[]
}
