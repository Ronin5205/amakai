import type { WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"

export type LiveWorkflow = {
  id: string
  name: string
  deployedAt: string
  updatedAt: string
  health: "healthy" | "degraded" | "down"
  nodeCount: number
  triggerType?: string
  /** Public webhook URL when an API trigger is deployed. */
  webhookUrl?: string
  /** Email / webhook subscription status from trigger registry. */
  subscriptionStatus?: string
}

export type LiveWorkflowDetail = LiveWorkflow & {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export type DeployWorkflowResult = {
  deployedAt: string
}
