/**
 * Trigger runtime: subscription sync, inbound payloads, renewal.
 *
 * To add a new trigger type:
 * 1. Add a recipe in lib/design/trigger-config.ts (TRIGGER_RECIPES)
 * 2. Document it in lib/triggers/registry.ts (TRIGGER_HANDLERS)
 * 3. Register on deploy in lib/triggers/subscriptions/sync.ts
 * 4. Add an inbound route (or reuse webhook) → enqueueAndProcessInboundRun
 */

export type {
  TriggerSubscriptionRow,
  ResolvedTriggerForSync,
  EmailProvider,
  EmailTriggerPayload,
  WebhookTriggerPayload,
  ScheduleTriggerPayload,
  RenewResult,
} from "@/lib/triggers/types"

export {
  resolveTriggerForSync,
  withCanonicalTriggerConfig,
} from "@/lib/triggers/resolve"

export {
  buildEmailPayload,
  buildWebhookPayload,
  buildSchedulePayload,
} from "@/lib/triggers/payloads"

export { TRIGGER_HANDLERS } from "@/lib/triggers/registry"

export {
  syncTriggerSubscriptions,
  listTriggerSubscriptionsForWorkflow,
  findSubscriptionByWebhookToken,
  findSubscriptionsByAccountEmail,
  updateSubscriptionHistoryId,
} from "@/lib/triggers/subscriptions/sync"

export {
  listNewGmailMessages,
  registerGmailWatch,
  findActiveGmailSubscriptionsByEmail,
} from "@/lib/triggers/subscriptions/gmail"

export {
  registerOutlookSubscription,
  renewOutlookSubscription,
  outlookNotificationUrl,
} from "@/lib/triggers/subscriptions/outlook"

export { renewExpiringSubscriptions } from "@/lib/triggers/renew"
