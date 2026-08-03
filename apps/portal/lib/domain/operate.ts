import type { ExecutionStatus } from "@/lib/domain/execution"
import type { LogEntry } from "@/lib/domain/monitoring"

export type WorkflowMetricItem = {
  label: string
  value: string | number
  unit?: string
  percentage?: number
  status?: "healthy" | "degraded" | "down"
}

export type WorkflowMetricSection = {
  id: string
  title: string
  description?: string
  metrics: WorkflowMetricItem[]
}

export type WorkflowMonitoringSnapshot = {
  workflowId: string
  workflowName: string
  sections: WorkflowMetricSection[]
  nodeHealth: Array<{
    nodeId: string
    label: string
    kind: string
    status: "healthy" | "degraded" | "down"
    lastCheckedAt: string
  }>
}

export type WorkflowExecution = {
  id: string
  workflowId: string
  workflowName: string
  status: ExecutionStatus
  trigger: string
  startedAt: string
  durationMs?: number
  triggerInput?: Record<string, Record<string, unknown>>
}

export type ExecutionStepLog = {
  nodeId: string
  nodeLabel: string
  status: "completed" | "failed" | "skipped" | "running"
  startedAt: string
  durationMs?: number
  message?: string
}

export type ExecutionLogDetail = {
  id: string
  workflowId: string
  workflowName: string
  status: ExecutionStatus
  trigger: string
  startedAt: string
  finishedAt?: string
  durationMs?: number
  triggerInput?: Record<string, Record<string, unknown>>
  steps: ExecutionStepLog[]
  logs: LogEntry[]
}
