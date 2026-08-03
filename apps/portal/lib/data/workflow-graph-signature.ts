import type { Workflow, WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"

type WorkflowGraphLike = {
  nodes: WorkflowNode[]
  edges?: WorkflowEdge[]
}

export function workflowGraphSignature(
  graph: WorkflowGraphLike | Workflow
): string {
  return JSON.stringify({
    nodes: graph.nodes,
    edges: graph.edges ?? [],
  })
}
