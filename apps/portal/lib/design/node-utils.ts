import {
  COMPONENT_CATALOG,
  getComponentCatalogItemById,
  type ComponentCatalogItem,
} from "@/lib/design/component-catalog"
import {
  getDefaultNodeConfig,
  getNodeDefinition,
} from "@/lib/design/node-definitions"
import { getDefaultVariantConfig } from "@/lib/design/component-variant-definitions"
import type { NodeKind, WorkflowNode } from "@/lib/domain/workflow"

export const NODE_PALETTE = COMPONENT_CATALOG

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

export function createNodeFromCatalogItem(item: ComponentCatalogItem): WorkflowNode {
  const config = {
    ...getDefaultNodeConfig(item.kind),
    ...getDefaultVariantConfig(item.id),
    ...item.defaultConfig,
    catalogItemId: item.id,
    ...(item.isBase ? {} : { componentVariant: item.id }),
  }

  return createNodeFromKind(item.kind, item.defaultLabel ?? item.label, config)
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

export const PALETTE_DRAG_PREFIX = "palette:"
export const TEMPLATE_DRAG_PREFIX = "template:"

export function paletteDragId(catalogItemId: string) {
  return `${PALETTE_DRAG_PREFIX}${catalogItemId}`
}

export function templateDragId(templateId: string) {
  return `${TEMPLATE_DRAG_PREFIX}${templateId}`
}

export function parsePaletteDragId(id: string): string | null {
  if (!id.startsWith(PALETTE_DRAG_PREFIX)) {
    return null
  }

  return id.slice(PALETTE_DRAG_PREFIX.length)
}

export function resolveCatalogItemFromDragId(id: string) {
  const catalogItemId = parsePaletteDragId(id)
  if (!catalogItemId) {
    return null
  }

  return getComponentCatalogItemById(catalogItemId)
}

export function parseTemplateDragId(id: string): string | null {
  if (!id.startsWith(TEMPLATE_DRAG_PREFIX)) {
    return null
  }

  return id.slice(TEMPLATE_DRAG_PREFIX.length)
}
