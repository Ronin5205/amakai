import type { NodeKind, WorkflowNode } from "@/lib/domain/workflow"
import { generateAiWorkflowGraph } from "@/lib/design/workflow-graph"

export const NODE_PALETTE: Array<{ kind: NodeKind; label: string; description: string }> = [
  { kind: "trigger", label: "Trigger", description: "Start the workflow from an event or schedule" },
  { kind: "sequential", label: "Action", description: "Run a single step in sequence" },
  { kind: "parallel", label: "Parallel", description: "Run multiple branches at once" },
  { kind: "conditional", label: "Condition", description: "Branch based on rules or data" },
  { kind: "loop", label: "Loop", description: "Repeat steps over a collection" },
  { kind: "approval", label: "Approval", description: "Pause for human review" },
  { kind: "exception", label: "Exception", description: "Handle errors and fallbacks" },
]

export function createNodeId() {
  return `node-${crypto.randomUUID()}`
}

export function createNodeFromKind(
  kind: NodeKind,
  label?: string,
  config: WorkflowNode["config"] = {}
): WorkflowNode {
  const paletteItem = NODE_PALETTE.find((item) => item.kind === kind)

  return {
    id: createNodeId(),
    label: label ?? paletteItem?.label ?? kind,
    kind,
    config,
  }
}

export function cloneTemplateNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  return nodes.map((node) => ({
    ...node,
    id: createNodeId(),
    config: { ...node.config },
  }))
}

export function generateWorkflowFromRequest(request: string): WorkflowNode[] {
  return generateAiWorkflowGraph(request).nodes
}

export const PALETTE_DRAG_PREFIX = "palette:"
export const TEMPLATE_DRAG_PREFIX = "template:"

export function paletteDragId(kind: NodeKind) {
  return `${PALETTE_DRAG_PREFIX}${kind}`
}

export function templateDragId(templateId: string) {
  return `${TEMPLATE_DRAG_PREFIX}${templateId}`
}

export function parsePaletteDragId(id: string): NodeKind | null {
  if (!id.startsWith(PALETTE_DRAG_PREFIX)) {
    return null
  }

  return id.slice(PALETTE_DRAG_PREFIX.length) as NodeKind
}

export function parseTemplateDragId(id: string): string | null {
  if (!id.startsWith(TEMPLATE_DRAG_PREFIX)) {
    return null
  }

  return id.slice(TEMPLATE_DRAG_PREFIX.length)
}
