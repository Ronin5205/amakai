import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import type { WorkflowNode } from "@/lib/domain/workflow"
import { getCatalogItemId } from "@/lib/design/component-variant-definitions"
import { getSecretByName } from "@/lib/data/secrets"
import type { OAuthTokenPayload, SecretMetadata } from "@/lib/domain/secret"
import { ensureFreshOAuthToken } from "@/lib/integrations/auth/token-refresh"
import { isUnifiedTriggerCatalogId } from "@/lib/design/trigger-config"
import { resolveTriggerForSync } from "@/lib/triggers/resolve"
import {
  parseGmailWatchExpiry,
  registerGmailWatch,
} from "@/lib/triggers/subscriptions/gmail"
import {
  outlookNotificationUrl,
  registerOutlookSubscription,
} from "@/lib/triggers/subscriptions/outlook"
import { insertWebhookSubscription } from "@/lib/triggers/subscriptions/webhook"
import { insertScheduleSubscription } from "@/lib/triggers/subscriptions/schedule"
import type { TriggerSubscriptionRow } from "@/lib/triggers/types"

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
 * Uses canonicalized trigger config so provider/operation are never missing
 * when mode resolves to integration.
 */
export async function syncTriggerSubscriptions(input: {
  workflowId: string
  nodes: WorkflowNode[]
}) {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to deploy trigger subscriptions.")
  }

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

    const { mode, config } = resolveTriggerForSync(node)

    if (mode === "manual") {
      continue
    }

    if (mode === "schedule") {
      const scheduleRow = await insertScheduleSubscription({
        supabase: auth.supabase,
        userId: auth.userId,
        workflowId: input.workflowId,
        node,
        config,
        deployedAt,
      })
      created.push(scheduleRow)
      continue
    }

    if (mode === "webhook" || mode === "signal") {
      const row = await insertWebhookSubscription({
        supabase: auth.supabase,
        userId: auth.userId,
        workflowId: input.workflowId,
        node,
        mode,
        config,
      })
      created.push(row)
      continue
    }

    if (mode === "integration") {
      const provider = String(config.provider ?? "").toLowerCase()
      const operation = String(config.operation ?? "receive").toLowerCase()

      if (operation !== "receive") {
        throw new Error(
          `External tool trigger "${node.label}" must use operation "receive" (got "${operation}").`
        )
      }
      if (provider !== "gmail" && provider !== "outlook") {
        throw new Error(
          `External tool trigger "${node.label}" needs provider gmail or outlook (got "${provider || "empty"}").`
        )
      }

      const secretName = String(config.secretName ?? "").trim()
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
            "Gmail watch not registered. Set GMAIL_PUBSUB_TOPIC and a Pub/Sub push to /api/integrations/gmail/push (use a tunnel for localhost)."
        } else {
          const watch = await registerGmailWatch(tokens.accessToken, topic)
          const parsed = parseGmailWatchExpiry(watch)
          subscriptionRef = parsed.subscriptionRef
          lastHistoryId = parsed.lastHistoryId
          expiresAt = parsed.expiresAt
        }
      } else {
        const notificationUrl = outlookNotificationUrl()
        const clientState = crypto.randomUUID()
        metadata.clientState = clientState
        const portalUrl = process.env.NEXT_PUBLIC_PORTAL_URL ?? ""
        if (
          !portalUrl ||
          portalUrl.includes("localhost") ||
          portalUrl.includes("127.0.0.1")
        ) {
          metadata.setupRequired = "NEXT_PUBLIC_PORTAL_URL"
          metadata.warning =
            "Outlook webhooks need a public HTTPS URL. Set NEXT_PUBLIC_PORTAL_URL to a tunnel (e.g. ngrok) and redeploy."
        }
        try {
          const sub = await registerOutlookSubscription(
            tokens.accessToken,
            notificationUrl,
            clientState
          )
          subscriptionRef = sub.id
          expiresAt = sub.expirationDateTime
          delete metadata.setupRequired
          delete metadata.warning
        } catch (error) {
          metadata.setupRequired =
            (metadata.setupRequired as string | undefined) ??
            "outlook_subscription"
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

export async function listTriggerSubscriptionsForWorkflow(
  workflowId: string
) {
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

/**
 * Find email receive subscriptions by account email.
 * Only returns active subscriptions (pending_setup cannot receive pushes).
 */
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
    .eq("status", "active")

  if (error || !data) {
    return []
  }

  return data as TriggerSubscriptionRow[]
}

export { updateSubscriptionHistoryId } from "@/lib/triggers/subscriptions/gmail"
