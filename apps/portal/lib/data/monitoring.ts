import type {
  ComponentHealth,
  LatencyMetric,
  QueueStats,
  ResourceMetric,
} from "@/lib/domain/monitoring"

export async function getResourceMetrics(): Promise<ResourceMetric[]> {
  return []
}

export async function getComponentHealth(): Promise<ComponentHealth[]> {
  return []
}

export async function getQueueStats(): Promise<QueueStats[]> {
  return []
}

export async function getLatencyMetrics(): Promise<LatencyMetric[]> {
  return []
}
