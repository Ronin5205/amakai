import type { TriggerRecipeId } from "@/lib/design/trigger-config"
import { buildEmailPayload, buildWebhookPayload, buildSchedulePayload } from "@/lib/triggers/payloads"

/**
 * Lightweight registry documenting how each trigger recipe behaves at runtime.
 * To add a new trigger:
 * 1. Add a recipe to TRIGGER_RECIPES in lib/design/trigger-config.ts
 * 2. Add an entry here (registerOnDeploy path + payload builder)
 * 3. Wire an inbound API route (or reuse webhook) that calls enqueueAndProcessInboundRun
 */
export type TriggerHandlerMeta = {
  recipeId: TriggerRecipeId
  /** How inbound events arrive. */
  inbound: "none" | "webhook" | "gmail-pubsub" | "outlook-graph" | "schedule-cron"
  /** Whether renewExpiringSubscriptions should touch this provider. */
  renewable: boolean
  description: string
}

export const TRIGGER_HANDLERS: Record<TriggerRecipeId, TriggerHandlerMeta> = {
  manual: {
    recipeId: "manual",
    inbound: "none",
    renewable: false,
    description: "Started from Testing or Production → Runs with a manual payload.",
  },
  schedule: {
    recipeId: "schedule",
    inbound: "schedule-cron",
    renewable: false,
    description: "Fired by POST /api/internal/process-queue when the schedule is due.",
  },
  webhook: {
    recipeId: "webhook",
    inbound: "webhook",
    renewable: false,
    description: "POST /api/webhooks/{token} with JSON matching output fields.",
  },
  signal: {
    recipeId: "signal",
    inbound: "webhook",
    renewable: false,
    description: "Same URL as webhook; operation label is signal.",
  },
  "gmail.receive": {
    recipeId: "gmail.receive",
    inbound: "gmail-pubsub",
    renewable: true,
    description: "Gmail users.watch → Pub/Sub → POST /api/integrations/gmail/push.",
  },
  "outlook.receive": {
    recipeId: "outlook.receive",
    inbound: "outlook-graph",
    renewable: true,
    description: "Graph subscription → POST /api/integrations/outlook/webhook.",
  },
}

export { buildEmailPayload, buildWebhookPayload, buildSchedulePayload }
