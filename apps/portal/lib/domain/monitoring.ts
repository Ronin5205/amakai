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
  workflowName: string
  message: string
  component?: string
}

export type AlertSeverity = "critical" | "warning" | "info"

export type Alert = {
  id: string
  severity: AlertSeverity
  title: string
  message: string
  source: string
  timestamp: string
  acknowledged?: boolean
}
