import type { ExecutionSummary } from "@/lib/domain/execution"
import type { AiUsage, LatencyMetric } from "@/lib/domain/monitoring"

export const liveWorkflowCountsFixture: ExecutionSummary = {
  running: 8,
  queued: 4,
  completed: 1247,
  failed: 12,
  pendingApproval: 3,
}

export const performanceMetricsFixtures: LatencyMetric[] = [
  {
    label: "Workflow Engine",
    p50Ms: 42,
    p95Ms: 128,
    p99Ms: 310,
  },
  {
    label: "AI Core (Planning)",
    p50Ms: 890,
    p95Ms: 2100,
    p99Ms: 4200,
  },
  {
    label: "API Gateway",
    p50Ms: 18,
    p95Ms: 45,
    p99Ms: 92,
  },
  {
    label: "Component Library",
    p50Ms: 35,
    p95Ms: 95,
    p99Ms: 180,
  },
]

export const aiUsageFixture: AiUsage = {
  promptTokens: 2847500,
  completionTokens: 912400,
  totalRequests: 3842,
  avgCostUsd: 0.024,
  modelUtilization: {
    "gpt-4o": 62,
    "gpt-4o-mini": 28,
    "claude-sonnet-4": 10,
  },
}
