import { isValidTriggerSchedule } from "@/lib/domain/trigger-schedule"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import type { WorkflowNode } from "@/lib/domain/workflow"
import { getCatalogItemId } from "@/lib/design/component-variant-definitions"
import { getSecretByName } from "@/lib/data/secrets"
import type { OAuthTokenPayload, SecretMetadata } from "@/lib/domain/secret"
import { ensureFreshOAuthToken } from "@/lib/integrations/auth/token-refresh"
import {
  isUnifiedTriggerCatalogId,
  normalizeTriggerMode,
} from "@/lib/design/trigger-config"

export type TriggerSubscriptionRow = {
  id: string
  user_id: string
  workflow_id: string
  trigger_node_id: string
  provider: string
  operation: string
  subscription_ref: string | null
  account_email: string | null
  webhook_token: string | null
  status: string
  expires_at: string | null
  last_history_id: string | null
  metadata: Record<string, unknown> | null
}

async function getAuthenticatedUserId() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return { supabase, userId: user.id }
}

function findTriggerNodes(nodes: WorkflowNode[]) {
  return nodes.filter((node) => node.kind === "trigger")
}

/**
 * Sync trigger subscriptions after deploy: webhooks, schedules, email watches.
 */
export async function syncTriggerSubscriptions(input: {
  workflowId: string
  nodes: WorkflowNode[]
}) {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to deploy trigger subscriptions.")
  }

  // Remove previous subscriptions for this workflow
  await auth.supabase
    .from("workflow_trigger_subscriptions")
    .delete()
    .eq("user_id", auth.userId)
    .eq("workflow_id", input.workflowId)

  const triggers = findTriggerNodes(input.nodes)
  const created: TriggerSubscriptionRow[] = []
  const deployedAt = new Date().toISOString()

  for (const node of triggers) {
    const catalogItemId = getCatalogItemId(node)
    if (!isUnifiedTriggerCatalogId(catalogItemId)) {
      continue
    }

    const mode = normalizeTriggerMode(node)

    if (mode === "manual") {
      continue
    }

    if (mode === "schedule") {
      const scheduleRow = await insertScheduleSubscription({
        supabase: auth.supabase,
        userId: auth.userId,
        workflowId: input.workflowId,
        node,
        deployedAt,
      })
      created.push(scheduleRow)
      continue
    }

    if (mode === "webhook" || mode === "signal") {
      const token =
        typeof node.config.webhookToken === "string" &&
        node.config.webhookToken.trim()
          ? node.config.webhookToken.trim()
          : crypto.randomUUID()

      const { data, error } = await auth.supabase
        .from("workflow_trigger_subscriptions")
        .insert({
          user_id: auth.userId,
          workflow_id: input.workflowId,
          trigger_node_id: node.id,
          provider: "webhook",
          operation: mode,
          webhook_token: token,
          status: "active",
          metadata: {
            authMode: node.config.authMode ?? "none",
            secretName: node.config.secretName ?? null,
            publicApiKey: node.config.publicApiKey ?? null,
          },
        })
        .select("*")
        .single()

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to register webhook trigger.")
      }
      created.push(data as TriggerSubscriptionRow)
      continue
    }

    if (mode === "integration") {
      const provider = String(node.config.provider ?? "")
      const operation = String(node.config.operation ?? "")
      if (operation !== "receive") {
        continue
      }
      if (provider !== "gmail" && provider !== "outlook") {
        continue
      }

      const secretName = String(node.config.secretName ?? "").trim()
      if (!secretName) {
        throw new Error(
          `External tool trigger "${node.label}" needs a connected secret before deploy.`
        )
      }

      const secret = await getSecretByName(secretName)
      if (!secret) {
        throw new Error(`Secret "${secretName}" was not found.`)
      }

      const tokens = await ensureFreshOAuthToken({
        provider,
        payload: secret.payload as OAuthTokenPayload,
        secretId: secret.id,
        metadata: secret.metadata as SecretMetadata,
      })

      let subscriptionRef: string | null = null
      let expiresAt: string | null = null
      let lastHistoryId: string | null = null
      const metadata: Record<string, unknown> = {
        secretName,
      }

      if (provider === "gmail") {
        const topic = process.env.GMAIL_PUBSUB_TOPIC
        if (!topic) {
          metadata.setupRequired = "GMAIL_PUBSUB_TOPIC"
          metadata.warning =
            "Gmail watch not registered. Set GMAIL_PUBSUB_TOPIC to enable inbound email."
        } else {
          const watch = await registerGmailWatch(tokens.accessToken, topic)
          subscriptionRef = watch.historyId ?? null
          lastHistoryId = watch.historyId ?? null
          expiresAt = watch.expiration
            ? new Date(Number(watch.expiration)).toISOString()
            : null
        }
      } else {
        const notificationUrl = `${process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3001"}/api/integrations/outlook/webhook`
        const clientState = crypto.randomUUID()
        metadata.clientState = clientState
        try {
          const sub = await registerOutlookSubscription(
            tokens.accessToken,
            notificationUrl,
            clientState
          )
          subscriptionRef = sub.id
          expiresAt = sub.expirationDateTime
        } catch (error) {
          metadata.setupRequired = "outlook_subscription"
          metadata.warning =
            error instanceof Error
              ? error.message
              : "Failed to register Outlook subscription"
        }
      }

      const { data, error } = await auth.supabase
        .from("workflow_trigger_subscriptions")
        .insert({
          user_id: auth.userId,
          workflow_id: input.workflowId,
          trigger_node_id: node.id,
          provider,
          operation: "receive",
          subscription_ref: subscriptionRef,
          account_email: secret.accountEmail ?? null,
          status: subscriptionRef ? "active" : "pending_setup",
          expires_at: expiresAt,
          last_history_id: lastHistoryId,
          metadata,
        })
        .select("*")
        .single()

      if (error || !data) {
        throw new Error(
          error?.message ?? "Failed to register email receive subscription."
        )
      }
      created.push(data as TriggerSubscriptionRow)
    }
  }

  return created
}

async function insertScheduleSubscription(input: {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  workflowId: string
  node: WorkflowNode
  deployedAt: string
}): Promise<TriggerSubscriptionRow> {
  const schedule = input.node.config.schedule

  if (!isValidTriggerSchedule(schedule)) {
    throw new Error(
      `Schedule trigger "${input.node.label}" needs a date and exact time (once or repeating).`
    )
  }

  const { data, error } = await input.supabase
    .from("workflow_trigger_subscriptions")
    .insert({
      user_id: input.userId,
      workflow_id: input.workflowId,
      trigger_node_id: input.node.id,
      provider: "schedule",
      operation: "schedule",
      status: "active",
      metadata: {
        schedule,
        timezone: "local",
        // Avoid immediately re-firing the current minute after redeploy.
        lastFiredAt: input.deployedAt,
      },
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to register schedule trigger.")
  }

  return data as TriggerSubscriptionRow
}

async function registerGmailWatch(accessToken: string, topicName: string) {
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

  return (await response.json()) as {
    historyId?: string
    expiration?: string
  }
}

async function registerOutlookSubscription(
  accessToken: string,
  notificationUrl: string,
  clientState: string
) {
  const expirationDateTime = new Date(
    Date.now() + 2 * 24 * 60 * 60 * 1000
  ).toISOString()

  const response = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      changeType: "created",
      notificationUrl,
      resource: "me/mailFolders('Inbox')/messages",
      expirationDateTime,
      clientState,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Outlook subscription failed: ${text}`)
  }

  return (await response.json()) as {
    id: string
    expirationDateTime: string
  }
}

export async function listTriggerSubscriptionsForWorkflow(workflowId: string) {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return []
  }

  const { data, error } = await auth.supabase
    .from("workflow_trigger_subscriptions")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("workflow_id", workflowId)
    .order("created_at", { ascending: true })

  if (error || !data) {
    return []
  }

  return data as TriggerSubscriptionRow[]
}

export async function findSubscriptionByWebhookToken(token: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("workflow_trigger_subscriptions")
    .select("*")
    .eq("webhook_token", token)
    .eq("status", "active")
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return data as TriggerSubscriptionRow
}

export async function findSubscriptionsByAccountEmail(
  provider: string,
  accountEmail: string
) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("workflow_trigger_subscriptions")
    .select("*")
    .eq("provider", provider)
    .eq("account_email", accountEmail)
    .eq("operation", "receive")
    .in("status", ["active", "pending_setup"])

  if (error || !data) {
    return []
  }

  return data as TriggerSubscriptionRow[]
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
