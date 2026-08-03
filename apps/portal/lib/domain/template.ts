import type { WorkflowNode, WorkflowEdge } from "@/lib/domain/workflow"

export type TemplateSource = "community" | "provider"

export type WorkflowTemplate = {
  id: string
  name: string
  description: string
  category: string
  nodeCount: number
  usageCount: number
  tags: string[]
  source: TemplateSource
  nodes: WorkflowNode[]
  /** Explicit edges; AI/templates populate these, manual palette drops do not. */
  edges: WorkflowEdge[]
}
