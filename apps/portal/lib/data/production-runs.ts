import { getLiveWorkflow } from "@/lib/data/deployments"
import type { ProductionRun, ProductionRunSummary } from "@/lib/domain/production"
import type { ExecutionStatus } from "@/lib/domain/execution"
import { resolveTriggerDisplayLabel } from "@/lib/design/trigger-config"
import { runPlaygroundValidation } from "@/lib/engine/playground"
import type { PlaygroundRunResult } from "@/lib/engine/types"
import { executeIntegrationNodeProduction } from "@/lib/integrations/registry/server-runtime"
import {
  extractTriggerInput,
  parseStoredProductionRunResult,
  type ProductionExecutionRecord,
} from "@/lib/operate/production-execution-insights"
import { PRODUCTION_EXECUTION_RETENTION_LIMIT } from "@/lib/operate/execution-log-retention"
import { createClient } from "@/utils/supabase/server"

export type WorkflowExecutionRow = {
  id: string
  workflow_id: string
  workflow_name: string
  status: ExecutionStatus
  trigger: string
  started_at: string
  finished_at: string | null
  duration_ms: number | null
  error_message: string | null
  result: Record<string, unknown> | null
}

const emptySummary: ProductionRunSummary = {
  running: 0,
  queued: 0,
  completed: 0,
  failed: 0,
  pendingApproval: 0,
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

function mapProductionRun(row: WorkflowExecutionRow): ProductionRun {
  const result = parseStoredProductionRunResult(row.result)
  const record: ProductionExecutionRecord = {
    id: row.id,
    workflowId: row.workflow_id,
    workflowName: row.workflow_name,
    status: row.status,
    trigger: row.trigger,
    startedAt: row.started_at,
    finishedAt: row.finished_at ?? undefined,
    durationMs: row.duration_ms ?? undefined,
    errorMessage: row.error_message ?? undefined,
    result,
  }

  return {
    ...record,
    triggerInput: extractTriggerInput(record),
  }
}

export function mapProductionExecutionRecord(
  row: WorkflowExecutionRow
): ProductionExecutionRecord {
  const run = mapProductionRun(row)
  const result = parseStoredProductionRunResult(row.result)
  const record: ProductionExecutionRecord = {
    ...run,
    result,
  }

  return {
    ...record,
    triggerInput: extractTriggerInput(record),
  }
}

export async function listProductionExecutionRecords(options?: {
  workflowId?: string
  limit?: number
}): Promise<ProductionExecutionRecord[]> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return []
  }

  const limit = options?.limit ?? 200

  let query = auth.supabase
    .from("workflow_executions")
    .select("*")
    .eq("user_id", auth.userId)
    .order("started_at", { ascending: false })
    .limit(limit)

  if (options?.workflowId) {
    query = query.eq("workflow_id", options.workflowId)
  }

  const { data, error } = await query

  if (error || !data) {
    return []
  }

  return (data as WorkflowExecutionRow[]).map(mapProductionExecutionRecord)
}

export async function getProductionExecutionRecord(
  executionId: string
): Promise<ProductionExecutionRecord | null> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return null
  }

  const { data, error } = await auth.supabase
    .from("workflow_executions")
    .select("*")
    .eq("id", executionId)
    .eq("user_id", auth.userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return mapProductionExecutionRecord(data as WorkflowExecutionRow)
}

export async function pruneOldProductionExecutions(workflowId: string) {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return
  }

  const { data, error } = await auth.supabase
    .from("workflow_executions")
    .select("id")
    .eq("user_id", auth.userId)
    .eq("workflow_id", workflowId)
    .order("started_at", { ascending: false })

  if (error || !data || data.length <= PRODUCTION_EXECUTION_RETENTION_LIMIT) {
    return
  }

  const staleIds = data
    .slice(PRODUCTION_EXECUTION_RETENTION_LIMIT)
    .map((row) => row.id)

  if (staleIds.length === 0) {
    return
  }

  await auth.supabase
    .from("workflow_executions")
    .delete()
    .eq("user_id", auth.userId)
    .in("id", staleIds)
}

function resolveRunStatus(result: PlaygroundRunResult): ExecutionStatus {
  if (result.pendingApproval) {
    return "pending_approval"
  }

  if (result.pendingWait) {
    return "running"
  }

  return result.passed ? "completed" : "failed"
}

function serializeRunResult(
  result: PlaygroundRunResult,
  triggerInput?: Record<string, Record<string, unknown>>
) {
  return {
    passed: result.passed,
    steps: result.steps,
    pendingApproval: result.pendingApproval ?? null,
    pendingWait: result.pendingWait ?? null,
    triggerInput: triggerInput ?? null,
  }
}

export async function listProductionRuns(limit = 50): Promise<ProductionRun[]> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return []
  }

  const { data, error } = await auth.supabase
    .from("workflow_executions")
    .select("*")
    .eq("user_id", auth.userId)
    .order("started_at", { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return (data as WorkflowExecutionRow[]).map(mapProductionRun)
}

export async function listProductionRunsForWorkflow(
  workflowId: string,
  limit = 50
): Promise<ProductionRun[]> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return []
  }

  const { data, error } = await auth.supabase
    .from("workflow_executions")
    .select("*")
    .eq("user_id", auth.userId)
    .eq("workflow_id", workflowId)
    .order("started_at", { ascending: false })
    .limit(limit)

  if (error || !data) {
    return []
  }

  return (data as WorkflowExecutionRow[]).map(mapProductionRun)
}

export async function getProductionRunSummary(): Promise<ProductionRunSummary> {
  const runs = await listProductionRuns(200)

  return runs.reduce((summary, run) => {
    switch (run.status) {
      case "running":
        summary.running += 1
        break
      case "queued":
        summary.queued += 1
        break
      case "completed":
        summary.completed += 1
        break
      case "failed":
        summary.failed += 1
        break
      case "pending_approval":
        summary.pendingApproval += 1
        break
    }
    return summary
  }, { ...emptySummary })
}

export async function getProductionRun(
  executionId: string
): Promise<ProductionRun | null> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return null
  }

  const { data, error } = await auth.supabase
    .from("workflow_executions")
    .select("*")
    .eq("id", executionId)
    .eq("user_id", auth.userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  return mapProductionRun(data as WorkflowExecutionRow)
}

export async function startProductionRun(
  workflowId: string,
  options?: {
    triggerPayloads?: Record<string, Record<string, unknown>>
  }
): Promise<ProductionRun> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to run workflows in production.")
  }

  const workflow = await getLiveWorkflow(workflowId)
  if (!workflow) {
    throw new Error("Deploy the workflow before running it in production.")
  }

  const triggerNode = workflow.nodes.find((node) => node.kind === "trigger")
  const triggerType = triggerNode
    ? resolveTriggerDisplayLabel(triggerNode)
    : "manual"

  const triggerPayloads = options?.triggerPayloads

  const startedAt = new Date()

  const { data: created, error: createError } = await auth.supabase
    .from("workflow_executions")
    .insert({
      user_id: auth.userId,
      workflow_id: workflow.id,
      workflow_name: workflow.name,
      status: "running",
      trigger: triggerType,
      started_at: startedAt.toISOString(),
      result: {
        triggerInput: triggerPayloads ?? null,
      },
    })
    .select("*")
    .single()

  if (createError || !created) {
    throw new Error(createError?.message ?? "Failed to start production run.")
  }

  const result = await runPlaygroundValidation(
    workflow.nodes,
    workflow.edges ?? [],
    {
      triggerPayloads,
      capturePayloads: true,
      executionMode: "production",
      integrationExecutor: executeIntegrationNodeProduction,
    }
  )

  const finishedAt = new Date()
  const durationMs = finishedAt.getTime() - startedAt.getTime()
  const status = resolveRunStatus(result)

  const { data: updated, error: updateError } = await auth.supabase
    .from("workflow_executions")
    .update({
      status,
      finished_at: finishedAt.toISOString(),
      duration_ms: durationMs,
      error_message: result.errorMessage ?? null,
      result: serializeRunResult(result, triggerPayloads),
    })
    .eq("id", created.id)
    .eq("user_id", auth.userId)
    .select("*")
    .single()

  if (updateError || !updated) {
    throw new Error(updateError?.message ?? "Failed to record production run.")
  }

  await pruneOldProductionExecutions(workflow.id)

  return mapProductionRun(updated as WorkflowExecutionRow)
}
