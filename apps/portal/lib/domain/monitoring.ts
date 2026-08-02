export type ResourceMetric = {
  label: string
  value: number
  unit: string
  percentage: number
}

export type LatencyMetric = {
  label: string
  p50Ms: number
  p95Ms: number
  p99Ms: number
}

export type ComponentHealth = {
  name: string
  status: "healthy" | "degraded" | "down"
  lastCheckedAt: string
}

export type QueueStats = {
  name: string
  depth: number
  processing: number
  workers: number
}

export type AiUsage = {
  promptTokens: number
  completionTokens: number
  totalRequests: number
  avgCostUsd: number
  modelUtilization: Record<string, number>
}

export type LogLevel = "info" | "warn" | "error" | "debug"

export type LogEntry = {
  id: string
  timestamp: string
  level: LogLevel
  workflowId: string
  workflowName: string
  executionId: string
  message: string
  title?: string
  component?: string
}

export type LogFilter = "all" | LogLevel | "alerts"

export type ExecutionLogGroup = {
  id: string
  executionId: string
  workflowId: string
  workflowName: string
  status: "running" | "queued" | "completed" | "failed" | "pending_approval"
  trigger: string
  startedAt: string
  finishedAt?: string
  durationMs?: number
  logCount: number
  level: LogLevel
  message: string
  logs: LogEntry[]
}
