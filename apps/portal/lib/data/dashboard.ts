import type { ExecutionSummary } from "@/lib/domain/execution"
import type { AiUsage, LatencyMetric } from "@/lib/domain/monitoring"

const emptyWorkflowCounts: ExecutionSummary = {
  running: 0,
  queued: 0,
  completed: 0,
  failed: 0,
  pendingApproval: 0,
}

const emptyAiUsage: AiUsage = {
  promptTokens: 0,
  completionTokens: 0,
  totalRequests: 0,
  avgCostUsd: 0,
  modelUtilization: {},
}

export async function getLiveWorkflowCounts(): Promise<ExecutionSummary> {
  return emptyWorkflowCounts
}

export async function getPerformanceMetrics(): Promise<LatencyMetric[]> {
  return []
}

export async function getAiUsage(): Promise<AiUsage> {
  return emptyAiUsage
}
