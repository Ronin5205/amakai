import { createAdminClient } from "@/utils/supabase/admin"
import { enqueueAndProcessInboundRun } from "@/lib/data/inbound-runs"
import type { TriggerSubscriptionRow } from "@/lib/data/trigger-subscriptions"
import { buildSchedulePayload } from "@/lib/triggers"
import {
  cronSlotKey,
  isCronDue,
  isValidCronExpression,
} from "@/lib/cron/expression"
import {
  formatScheduleSummary,
  isTriggerScheduleDue,
  parseTriggerSchedule,
  scheduleSlotKey,
  type TriggerSchedule,
} from "@/lib/domain/trigger-schedule"

export type ScheduleFireResult = {
  subscriptionId: string
  workflowId: string
  executionId?: string
  status: "fired" | "skipped" | "duplicate" | "failed"
  error?: string
}

function readLastFiredAt(subscription: TriggerSubscriptionRow): Date | null {
  const raw = subscription.metadata?.lastFiredAt
  if (typeof raw !== "string") {
    return null
  }
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? null : date
}

function readStructuredSchedule(
  subscription: TriggerSubscriptionRow
): TriggerSchedule | null {
  return parseTriggerSchedule(subscription.metadata?.schedule)
}

function readLegacyCron(subscription: TriggerSubscriptionRow): string | null {
  const raw = subscription.metadata?.cron
  if (typeof raw !== "string") {
    return null
  }
  const expression = raw.trim()
  return isValidCronExpression(expression) ? expression : null
}

export async function listActiveScheduleSubscriptions(): Promise<
  TriggerSubscriptionRow[]
> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("workflow_trigger_subscriptions")
    .select("*")
    .eq("provider", "schedule")
    .eq("status", "active")

  if (error || !data) {
    return []
  }

  return data as TriggerSubscriptionRow[]
}

async function markScheduleFired(
  subscription: TriggerSubscriptionRow,
  firedAt: Date,
  options?: { complete?: boolean }
) {
  const supabase = createAdminClient()
  const metadata = {
    ...(subscription.metadata ?? {}),
    lastFiredAt: firedAt.toISOString(),
  }

  await supabase
    .from("workflow_trigger_subscriptions")
    .update({
      metadata,
      status: options?.complete ? "completed" : subscription.status,
      updated_at: firedAt.toISOString(),
    })
    .eq("id", subscription.id)
}

/**
 * Find schedule subscriptions due at `now` and enqueue production runs.
 * Supports structured alarm-style schedules and legacy cron metadata.
 */
export async function fireDueSchedules(
  now: Date = new Date()
): Promise<ScheduleFireResult[]> {
  const subscriptions = await listActiveScheduleSubscriptions()
  const results: ScheduleFireResult[] = []
  const supabase = createAdminClient()

  for (const subscription of subscriptions) {
    const schedule = readStructuredSchedule(subscription)
    const legacyCron = schedule ? null : readLegacyCron(subscription)
    const lastFiredAt = readLastFiredAt(subscription)

    let due = false
    let slot = cronSlotKey(now)
    let summary = "schedule"

    if (schedule) {
      due = isTriggerScheduleDue({ schedule, now, lastFiredAt })
      slot = scheduleSlotKey(schedule, now)
      summary = formatScheduleSummary(schedule)
    } else if (legacyCron) {
      due = isCronDue({ expression: legacyCron, now, lastFiredAt })
    } else {
      results.push({
        subscriptionId: subscription.id,
        workflowId: subscription.workflow_id,
        status: "skipped",
        error: "Missing or invalid schedule configuration.",
      })
      continue
    }

    if (!due) {
      results.push({
        subscriptionId: subscription.id,
        workflowId: subscription.workflow_id,
        status: "skipped",
      })
      continue
    }

    const { data: workflow } = await supabase
      .from("workflows")
      .select("name, status")
      .eq("id", subscription.workflow_id)
      .maybeSingle()

    if (!workflow || workflow.status !== "published") {
      results.push({
        subscriptionId: subscription.id,
        workflowId: subscription.workflow_id,
        status: "skipped",
        error: "Workflow is not published.",
      })
      continue
    }

    const firedAt = now

    try {
      const result = await enqueueAndProcessInboundRun({
        userId: subscription.user_id,
        workflowId: subscription.workflow_id,
        workflowName: workflow.name ?? "Workflow",
        triggerLabel: "schedule",
        triggerNodeId: subscription.trigger_node_id,
        payload: buildSchedulePayload({
          scheduledFor: floorToMinuteIso(now),
          triggeredAt: firedAt.toISOString(),
          schedule: schedule ?? undefined,
          scheduleSummary: schedule ? summary : undefined,
          cron: legacyCron ?? undefined,
        }),
        eventKey: `schedule:${subscription.id}:${slot}`,
      })

      await markScheduleFired(subscription, firedAt, {
        complete: schedule?.repeat === "once",
      })

      results.push({
        subscriptionId: subscription.id,
        workflowId: subscription.workflow_id,
        executionId: result.executionId,
        status: result.status === "duplicate" ? "duplicate" : "fired",
      })
    } catch (error) {
      results.push({
        subscriptionId: subscription.id,
        workflowId: subscription.workflow_id,
        status: "failed",
        error:
          error instanceof Error ? error.message : "Failed to fire schedule.",
      })
    }
  }

  return results
}

function floorToMinuteIso(date: Date): string {
  const next = new Date(date)
  next.setUTCSeconds(0, 0)
  return next.toISOString()
}
