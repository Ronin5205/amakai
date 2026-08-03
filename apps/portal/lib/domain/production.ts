import type { ExecutionStatus } from "@/lib/domain/execution"

export type ProductionRun = {
  id: string
  workflowId: string
  workflowName: string
  status: ExecutionStatus
  trigger: string
  startedAt: string
  finishedAt?: string
  durationMs?: number
  errorMessage?: string
  triggerInput?: Record<string, Record<string, unknown>>
}

export type ProductionRunSummary = {
  running: number
  queued: number
  completed: number
  failed: number
  pendingApproval: number
}
