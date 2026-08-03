import { buildWorkflowMonitoringSnapshot } from "@/lib/operate/workflow-monitoring-profile"
import { getLiveWorkflow } from "@/lib/data/deployments"
import { listProductionExecutionRecords } from "@/lib/data/production-runs"
import type { WorkflowMonitoringSnapshot } from "@/lib/domain/operate"
import type {
  ComponentHealth,
  LatencyMetric,
  QueueStats,
  ResourceMetric,
} from "@/lib/domain/monitoring"

export async function getWorkflowMonitoring(
  workflowId: string
): Promise<WorkflowMonitoringSnapshot | null> {
  const [workflow, executions] = await Promise.all([
    getLiveWorkflow(workflowId),
    listProductionExecutionRecords({ workflowId, limit: 200 }),
  ])

  if (!workflow) {
    return null
  }

  return buildWorkflowMonitoringSnapshot(workflow, executions)
}

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
