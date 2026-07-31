import type { WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import { createEdge } from "@/lib/design/workflow-graph"

export function workflowNode(
  partial: Partial<WorkflowNode> &
    Pick<WorkflowNode, "id" | "kind" | "label">
): WorkflowNode {
  return {
    config: {},
    ...partial,
  }
}

export function triggerNode(
  id: string,
  outputFields: string[] = ["name", "email"]
): WorkflowNode {
  return workflowNode({
    id,
    label: "Trigger",
    kind: "trigger",
    config: {
      catalogItemId: "trigger.workflow",
      triggerType: "manual",
      outputFields,
    },
    position: { x: 0, y: 0 },
  })
}

export function dataTableNode(
  id: string,
  options: {
    operation?: "read" | "write"
    tableName?: string
    columnMappings?: Array<{ columnKey: string; sourceField: string }>
  } = {}
): WorkflowNode {
  return workflowNode({
    id,
    label: options.operation === "read" ? "Read table" : "Write table",
    kind: "sequential",
    config: {
      catalogItemId: "action.data-table",
      operation: options.operation ?? "write",
      tableName: options.tableName ?? "demo_contacts",
      columnMappings: options.columnMappings ?? [],
    },
    position: { x: 240, y: 0 },
  })
}

export function sequentialEdge(
  source: WorkflowNode,
  target: WorkflowNode,
  ports?: { sourcePort?: string; targetPort?: string }
): WorkflowEdge {
  return createEdge(source.id, target.id, {
    sourcePort: ports?.sourcePort ?? "main-out",
    targetPort: ports?.targetPort ?? "main-in",
  })
}
