import type {
  ComponentHealth,
  LatencyMetric,
  QueueStats,
  ResourceMetric,
} from "@/lib/domain/monitoring"

export const resourceMetricsFixtures: ResourceMetric[] = [
  { label: "CPU Utilization", value: 42, unit: "%", percentage: 42 },
  { label: "Memory Usage", value: 6.8, unit: "GB", percentage: 68 },
  { label: "Queue Backlog", value: 23, unit: "jobs", percentage: 23 },
  { label: "Storage I/O", value: 156, unit: "MB/s", percentage: 31 },
  { label: "Network Throughput", value: 890, unit: "Mbps", percentage: 45 },
]

export const componentHealthFixtures: ComponentHealth[] = [
  {
    name: "Workflow Engine",
    status: "healthy",
    lastCheckedAt: "2026-07-30T10:45:00.000Z",
  },
  {
    name: "AI Core",
    status: "healthy",
    lastCheckedAt: "2026-07-30T10:45:00.000Z",
  },
  {
    name: "Validation Engine",
    status: "healthy",
    lastCheckedAt: "2026-07-30T10:45:00.000Z",
  },
  {
    name: "Deployment Engine",
    status: "degraded",
    lastCheckedAt: "2026-07-30T10:44:30.000Z",
  },
  {
    name: "Monitoring Service",
    status: "healthy",
    lastCheckedAt: "2026-07-30T10:45:00.000Z",
  },
  {
    name: "Analytics Engine",
    status: "healthy",
    lastCheckedAt: "2026-07-30T10:45:00.000Z",
  },
]

export const queueStatsFixtures: QueueStats[] = [
  {
    name: "execution-queue",
    depth: 23,
    processing: 8,
    workers: 12,
  },
  {
    name: "ai-planning-queue",
    depth: 5,
    processing: 2,
    workers: 4,
  },
  {
    name: "deployment-queue",
    depth: 1,
    processing: 1,
    workers: 2,
  },
  {
    name: "notification-queue",
    depth: 47,
    processing: 15,
    workers: 8,
  },
]

export const latencyMetricsFixtures: LatencyMetric[] = [
  {
    label: "End-to-End Execution",
    p50Ms: 1240,
    p95Ms: 4800,
    p99Ms: 9200,
  },
  {
    label: "AI Inference",
    p50Ms: 650,
    p95Ms: 1800,
    p99Ms: 3500,
  },
  {
    label: "External API Calls",
    p50Ms: 220,
    p95Ms: 890,
    p99Ms: 2100,
  },
  {
    label: "Database Queries",
    p50Ms: 12,
    p95Ms: 45,
    p99Ms: 120,
  },
]
