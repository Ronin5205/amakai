import type { Execution, ExecutionSummary } from "@/lib/domain/execution"

const emptyExecutionSummary: ExecutionSummary = {
  running: 0,
  queued: 0,
  completed: 0,
  failed: 0,
  pendingApproval: 0,
}

export async function listExecutions(): Promise<Execution[]> {
  return []
}

export async function getExecutionSummary(): Promise<ExecutionSummary> {
  return emptyExecutionSummary
}
