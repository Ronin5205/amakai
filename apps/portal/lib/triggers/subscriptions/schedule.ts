import { createClient } from "@/utils/supabase/server"
import { isValidTriggerSchedule } from "@/lib/domain/trigger-schedule"
import type { WorkflowNode } from "@/lib/domain/workflow"
import type { TriggerSubscriptionRow } from "@/lib/triggers/types"

export async function insertScheduleSubscription(input: {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  workflowId: string
  node: WorkflowNode
  config: Record<string, unknown>
  deployedAt: string
}): Promise<TriggerSubscriptionRow> {
  const schedule = input.config.schedule ?? input.node.config.schedule

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
