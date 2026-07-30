import type {
  ComponentHealth,
  LatencyMetric,
  QueueStats,
  ResourceMetric,
} from "@/lib/domain/monitoring"
import {
  componentHealthFixtures,
  latencyMetricsFixtures,
  queueStatsFixtures,
  resourceMetricsFixtures,
} from "./fixtures/monitoring"

export async function getResourceMetrics(): Promise<ResourceMetric[]> {
  return resourceMetricsFixtures
}

export async function getComponentHealth(): Promise<ComponentHealth[]> {
  return componentHealthFixtures
}

export async function getQueueStats(): Promise<QueueStats[]> {
  return queueStatsFixtures
}

export async function getLatencyMetrics(): Promise<LatencyMetric[]> {
  return latencyMetricsFixtures
}
