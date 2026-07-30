import type { NodeKind, WorkflowNode } from "@/lib/domain/workflow"
import { COMPONENT_CATALOG } from "@/lib/design/component-catalog"
import {
  getDefaultNodeConfig,
  getNodeDefinition,
} from "@/lib/design/node-definitions"
import { generateAiWorkflowGraph } from "@/lib/design/workflow-graph"

export const NODE_PALETTE = COMPONENT_CATALOG.map(
  ({ kind, label, description }) => ({
    kind,
    label,
    description,
  })
)

export function createNodeId() {
  return `node-${crypto.randomUUID()}`
}

export function createNodeFromKind(
  kind: NodeKind,
  label?: string,
  config: WorkflowNode["config"] = getDefaultNodeConfig(kind)
): WorkflowNode {
  const definition = getNodeDefinition(kind)

  return {
    id: createNodeId(),
    label: label ?? definition.label,
    kind,
    config: { ...config },
  }
}

export function cloneTemplateNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  return nodes.map((node) => ({
    ...node,
    id: createNodeId(),
    config: { ...node.config },
    metadata: node.metadata ? { ...node.metadata } : undefined,
    processing: node.processing ? { ...node.processing } : undefined,
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
