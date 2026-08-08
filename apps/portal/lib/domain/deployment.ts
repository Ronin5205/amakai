import type { TriggerMode } from "@/lib/design/trigger-config"
import type { WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"

export type LiveWorkflow = {
  id: string
  name: string
  deployedAt: string
  updatedAt: string
  health: "healthy" | "degraded" | "down"
  nodeCount: number
  triggerMode?: TriggerMode
  triggerType?: string
  /** Public webhook URL when an API trigger is deployed. */
  webhookUrl?: string
  /** Email / webhook subscription status from trigger registry. */
  subscriptionStatus?: string
  /** Human-readable setup warning from subscription metadata. */
  subscriptionWarning?: string
  /** Env / infra key required before the trigger can receive events. */
  setupRequired?: string
}

export type LiveWorkflowDetail = LiveWorkflow & {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export type DeployWorkflowResult = {
  deployedAt: string
}

export function isManualLiveWorkflow(workflow: LiveWorkflow): boolean {
  return workflow.triggerMode === "manual"
}
