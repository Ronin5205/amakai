import { runPlaygroundValidation } from "@/lib/engine/playground"
import type { WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import { executeIntegrationNodeProduction } from "@/lib/integrations/registry/server-runtime"
import { createAdminClient } from "@/utils/supabase/admin"
import { PRODUCTION_EXECUTION_RETENTION_LIMIT } from "@/lib/operate/execution-log-retention"

export type QueuedTriggerInput = {
  userId: string
  workflowId: string
  workflowName: string
  triggerLabel: string
  triggerNodeId: string
  payload: Record<string, unknown>
  eventKey?: string
}

/**
 * Enqueue an inbound trigger event as a queued execution, then process it.
 * Used by webhook / email push handlers (no user session).
 */
export async function enqueueAndProcessInboundRun(
  input: QueuedTriggerInput
): Promise<{ executionId: string; status: string }> {
  const supabase = createAdminClient()

  if (input.eventKey) {
    const { data: existing } = await supabase
      .from("workflow_trigger_events")
      .select("id, execution_id")
      .eq("workflow_id", input.workflowId)
      .eq("event_key", input.eventKey)
      .maybeSingle()

    if (existing) {
      return {
        executionId: existing.execution_id ?? existing.id,
        status: "duplicate",
      }
    }
  }

  const startedAt = new Date()

  const { data: created, error: createError } = await supabase
    .from("workflow_executions")
    .insert({
      user_id: input.userId,
      workflow_id: input.workflowId,
      workflow_name: input.workflowName,
      status: "queued",
      trigger: input.triggerLabel,
      started_at: startedAt.toISOString(),
      result: {
        triggerInput: { [input.triggerNodeId]: input.payload },
      },
    })
    .select("id")
    .single()

  if (createError || !created) {
    throw new Error(createError?.message ?? "Failed to enqueue execution.")
  }

  if (input.eventKey) {
    await supabase.from("workflow_trigger_events").insert({
      user_id: input.userId,
      workflow_id: input.workflowId,
      event_key: input.eventKey,
      execution_id: created.id,
    })
  }

  // Promote to running and execute inline (MVP worker).
  await supabase
    .from("workflow_executions")
    .update({ status: "running" })
    .eq("id", created.id)

  const { data: version } = await supabase
    .from("workflow_versions")
    .select("graph")
    .eq("workflow_id", input.workflowId)
    .eq("version", "live")
    .maybeSingle()

  const graph = version?.graph as
    | { nodes?: WorkflowNode[]; edges?: WorkflowEdge[] }
    | null
    | undefined

  if (!graph?.nodes) {
    await supabase
      .from("workflow_executions")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: "Live workflow graph not found.",
      })
      .eq("id", created.id)
    return { executionId: created.id, status: "failed" }
  }

  const result = await runPlaygroundValidation(graph.nodes, graph.edges ?? [], {
    triggerPayloads: { [input.triggerNodeId]: input.payload },
    capturePayloads: true,
    executionMode: "production",
    integrationExecutor: executeIntegrationNodeProduction,
  })

  const finishedAt = new Date()
  const status = result.pendingApproval
    ? "pending_approval"
    : result.passed
      ? "completed"
      : "failed"

  await supabase
    .from("workflow_executions")
    .update({
      status,
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
      error_message: result.errorMessage ?? null,
      result: {
        passed: result.passed,
        steps: result.steps,
        pendingApproval: result.pendingApproval ?? null,
        pendingWait: result.pendingWait ?? null,
        triggerInput: { [input.triggerNodeId]: input.payload },
      },
    })
    .eq("id", created.id)

  // Best-effort retention prune
  const { data: runs } = await supabase
    .from("workflow_executions")
    .select("id")
    .eq("workflow_id", input.workflowId)
    .order("started_at", { ascending: false })

  if (runs && runs.length > PRODUCTION_EXECUTION_RETENTION_LIMIT) {
    const staleIds = runs
      .slice(PRODUCTION_EXECUTION_RETENTION_LIMIT)
      .map((row) => row.id)
    await supabase.from("workflow_executions").delete().in("id", staleIds)
  }

  return { executionId: created.id, status }
}

/**
 * Process a single queued execution by id (callable from a cron/worker route).
 */
export async function processQueuedExecution(executionId: string) {
  const supabase = createAdminClient()
  const { data: row } = await supabase
    .from("workflow_executions")
    .select("*")
    .eq("id", executionId)
    .maybeSingle()

  if (!row || row.status !== "queued") {
    return null
  }

  const triggerInput =
    (row.result as { triggerInput?: Record<string, Record<string, unknown>> })
      ?.triggerInput ?? {}

  const triggerNodeId = Object.keys(triggerInput)[0] ?? "trigger"
  const payload = triggerInput[triggerNodeId] ?? {}
  const startedAt = new Date(row.started_at)

  await supabase
    .from("workflow_executions")
    .update({ status: "running" })
    .eq("id", executionId)

  const { data: version } = await supabase
    .from("workflow_versions")
    .select("graph")
    .eq("workflow_id", row.workflow_id)
    .eq("version", "live")
    .maybeSingle()

  const graph = version?.graph as
    | { nodes?: WorkflowNode[]; edges?: WorkflowEdge[] }
    | null
    | undefined

  if (!graph?.nodes) {
    await supabase
      .from("workflow_executions")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: "Live workflow graph not found.",
      })
      .eq("id", executionId)
    return { executionId, status: "failed" }
  }

  const result = await runPlaygroundValidation(graph.nodes, graph.edges ?? [], {
    triggerPayloads: { [triggerNodeId]: payload },
    capturePayloads: true,
    executionMode: "production",
    integrationExecutor: executeIntegrationNodeProduction,
  })

  const finishedAt = new Date()
  const status = result.pendingApproval
    ? "pending_approval"
    : result.passed
      ? "completed"
      : "failed"

  await supabase
    .from("workflow_executions")
    .update({
      status,
      finished_at: finishedAt.toISOString(),
      duration_ms: finishedAt.getTime() - startedAt.getTime(),
      error_message: result.errorMessage ?? null,
      result: {
        passed: result.passed,
        steps: result.steps,
        pendingApproval: result.pendingApproval ?? null,
        pendingWait: result.pendingWait ?? null,
        triggerInput,
      },
    })
    .eq("id", executionId)

  return { executionId, status }
}
