import type { Workflow, WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"

export type WorkflowGraphPayload = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export type WorkflowRow = {
  id: string
  user_id: string
  name: string
  status: "draft" | "published"
  graph: WorkflowGraphPayload
  updated_at: string
  created_at: string
}

export function mapWorkflowRow(row: WorkflowRow): Workflow {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    nodes: row.graph?.nodes ?? [],
    edges: row.graph?.edges ?? [],
    updatedAt: row.updated_at,
  }
}

export function toWorkflowGraphPayload(workflow: Workflow): WorkflowGraphPayload {
  return {
    nodes: workflow.nodes,
    edges: workflow.edges ?? [],
  }
}

export function isPersistedWorkflowId(id: string) {
  return id !== "draft" && id !== "new"
}

export function createEmptyDraftWorkflow(): Workflow {
  return {
    id: "draft",
    name: "Untitled workflow",
    status: "draft",
    nodes: [],
    edges: [],
    updatedAt: new Date().toISOString(),
  }
}
