import type { TriggerMode, TriggerRecipe } from "@/lib/design/trigger-config"

/** Row shape for `workflow_trigger_subscriptions`. */
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

/** Canonical trigger config used at deploy / runtime. */
export type ResolvedTriggerForSync = {
  mode: TriggerMode
  config: Record<string, unknown>
  recipe: TriggerRecipe
}

export type EmailProvider = "gmail" | "outlook"

export type EmailTriggerPayload = {
  from: string
  to: string
  subject: string
  body: string
  bodyHtml: string
  messageId: string
  threadId: string
  receivedAt: string
  attachments: unknown[]
  triggerType: "email"
  provider: EmailProvider
  triggeredAt: string
}

export type WebhookTriggerPayload = Record<string, unknown> & {
  triggeredAt: string
  triggerType: string
}

export type ScheduleTriggerPayload = {
  triggerType: "schedule"
  scheduledFor: string
  triggeredAt: string
  schedule?: unknown
  scheduleSummary?: string
  cron?: string
}

export type GmailWatchResult = {
  historyId?: string
  expiration?: string
}

export type OutlookSubscriptionResult = {
  id: string
  expirationDateTime: string
}

export type RenewResult = {
  subscriptionId: string
  provider: string
  status: "renewed" | "skipped" | "failed"
  error?: string
}
