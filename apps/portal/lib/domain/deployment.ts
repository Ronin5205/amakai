import type { WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"

export type LiveWorkflow = {
  id: string
  name: string
  deployedAt: string
  updatedAt: string
  health: "healthy" | "degraded" | "down"
  nodeCount: number
  triggerType?: string
}

export type LiveWorkflowDetail = LiveWorkflow & {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export type DeployWorkflowResult = {
  deployedAt: string
}
