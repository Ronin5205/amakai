import type { ExecutionSummary } from "@/lib/domain/execution"
import type { AiUsage, LatencyMetric } from "@/lib/domain/monitoring"
import {
  aiUsageFixture,
  liveWorkflowCountsFixture,
  performanceMetricsFixtures,
} from "./fixtures/dashboard"

export async function getLiveWorkflowCounts(): Promise<ExecutionSummary> {
  return liveWorkflowCountsFixture
}

export async function getPerformanceMetrics(): Promise<LatencyMetric[]> {
  return performanceMetricsFixtures
}

export async function getAiUsage(): Promise<AiUsage> {
  return aiUsageFixture
}
