import type { WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"

export type WorkflowGraphSnapshot = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export const WORKFLOW_HISTORY_LIMIT = 50

export function cloneWorkflowSnapshot(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowGraphSnapshot {
  return {
    nodes: nodes.map((node) => ({
      ...node,
      config: { ...node.config },
      position: node.position ? { ...node.position } : undefined,
    })),
    edges: edges.map((edge) => ({ ...edge })),
  }
}
