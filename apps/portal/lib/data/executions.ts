import type { Execution, ExecutionSummary } from "@/lib/domain/execution"
import type { WorkflowExecution } from "@/lib/domain/operate"
import {
  getProductionRunSummary,
  listProductionRuns,
  listProductionRunsForWorkflow,
} from "@/lib/data/production-runs"
import type { ProductionRun } from "@/lib/domain/production"

const emptyExecutionSummary: ExecutionSummary = {
  running: 0,
  queued: 0,
  completed: 0,
  failed: 0,
  pendingApproval: 0,
}

function mapProductionRunToWorkflowExecution(
  run: ProductionRun
): WorkflowExecution {
  return {
    id: run.id,
    workflowId: run.workflowId,
    workflowName: run.workflowName,
    status: run.status,
    trigger: run.trigger,
    startedAt: run.startedAt,
    durationMs: run.durationMs,
    triggerInput: run.triggerInput,
  }
}

function mapProductionRunToExecution(run: ProductionRun): Execution {
  return {
    id: run.id,
    workflowName: run.workflowName,
    status: run.status,
    startedAt: run.startedAt,
    durationMs: run.durationMs,
    trigger: run.trigger,
    environment: "production",
  }
}

export async function listExecutions(): Promise<Execution[]> {
  const runs = await listProductionRuns()
  return runs.map(mapProductionRunToExecution)
}

export async function listWorkflowExecutions(
  workflowId: string
): Promise<WorkflowExecution[]> {
  const runs = await listProductionRunsForWorkflow(workflowId)
  return runs.map(mapProductionRunToWorkflowExecution)
}

export async function getWorkflowExecutionSummary(
  workflowId: string
): Promise<ExecutionSummary> {
  const executions = await listWorkflowExecutions(workflowId)

  return executions.reduce(
    (summary, execution) => {
      switch (execution.status) {
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
    },
    { ...emptyExecutionSummary }
  )
}

export async function getExecutionSummary(): Promise<ExecutionSummary> {
  return getProductionRunSummary()
}
