import { createClient } from "@/utils/supabase/server"
import type { WorkflowNode } from "@/lib/domain/workflow"
import type { TriggerSubscriptionRow } from "@/lib/triggers/types"

export async function insertWebhookSubscription(input: {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  workflowId: string
  node: WorkflowNode
  mode: "webhook" | "signal"
  config: Record<string, unknown>
}): Promise<TriggerSubscriptionRow> {
  const token =
    typeof input.config.webhookToken === "string" &&
    input.config.webhookToken.trim()
      ? input.config.webhookToken.trim()
      : typeof input.node.config.webhookToken === "string" &&
          input.node.config.webhookToken.trim()
        ? input.node.config.webhookToken.trim()
        : crypto.randomUUID()

  const { data, error } = await input.supabase
    .from("workflow_trigger_subscriptions")
    .insert({
      user_id: input.userId,
      workflow_id: input.workflowId,
      trigger_node_id: input.node.id,
      provider: "webhook",
      operation: input.mode,
      webhook_token: token,
      status: "active",
      metadata: {
        authMode: input.config.authMode ?? "none",
        secretName: input.config.secretName ?? null,
        publicApiKey: input.config.publicApiKey ?? null,
      },
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to register webhook trigger.")
  }

  return data as TriggerSubscriptionRow
}
