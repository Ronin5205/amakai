export type ExecutionStatus =
  | "running"
  | "queued"
  | "completed"
  | "failed"
  | "pending_approval"

export type Execution = {
  id: string
  workflowName: string
  status: ExecutionStatus
  startedAt: string
  durationMs?: number
  trigger: string
  environment: string
}

export type ExecutionSummary = {
  running: number
  queued: number
  completed: number
  failed: number
  pendingApproval: number
}
