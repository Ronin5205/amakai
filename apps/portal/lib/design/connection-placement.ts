import {
  COMPONENT_CATALOG,
  getComponentCatalogItemById,
  type ComponentCatalogItem,
} from "@/lib/design/component-catalog"
import {
  getNodePortCount,
  getNodePortIndex,
  getPortYOffset,
  resolveInputPortId,
  resolveOutputPortId,
  getNodeDimensions,
} from "@/lib/design/node-layout"
import { resolveNodeDefinition } from "@/lib/design/resolve-node-definition"
import { clampNodePosition } from "@/lib/design/layout-utils"
import { createNodeFromCatalogItem } from "@/lib/design/node-utils"
import { sanitizeManualEdge } from "@/lib/design/workflow-graph"
import type { ConnectionDraft } from "@/lib/design/connection-draft"
import type { PortType, WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"

function resolvePortType(
  node: WorkflowNode,
  side: "input" | "output",
  portId?: string
): PortType | undefined {
  const definition = resolveNodeDefinition(node)
  const ports = side === "input" ? definition.inputs : definition.outputs
  const resolvedId =
    side === "input"
      ? resolveInputPortId(node, portId)
      : resolveOutputPortId(node, portId)

  return ports.find((port) => port.id === resolvedId)?.type
}

function catalogItemSupportsDraft(
  item: ComponentCatalogItem,
  draft: ConnectionDraft,
  requiredType: PortType
) {
  const node = createNodeFromCatalogItem(item)
  const definition = resolveNodeDefinition(node)

  if (draft.side === "output") {
    return definition.inputs.some((port) => port.type === requiredType)
  }

  return definition.outputs.some((port) => port.type === requiredType)
}

export function filterCatalogForConnectionDraft(
  draft: ConnectionDraft,
  anchorNode: WorkflowNode,
  query = ""
): ComponentCatalogItem[] {
  const requiredType = resolvePortType(anchorNode, draft.side, draft.portId)
  if (!requiredType) {
    return []
  }

  const normalized = query.trim().toLowerCase()

  return COMPONENT_CATALOG.filter((item) => {
    if (!catalogItemSupportsDraft(item, draft, requiredType)) {
      return false
    }

    if (!normalized) {
      return true
    }

    const haystack = [item.label, item.description, item.id]
      .join(" ")
      .toLowerCase()

    return haystack.includes(normalized)
  })
}

export function positionNodeForPortAtPoint(
  node: WorkflowNode,
  side: "input" | "output",
  portId: string | undefined,
  worldPoint: { x: number; y: number }
) {
  const { width, height } = getNodeDimensions(node)
  const portCount = getNodePortCount(node, side)
  const portIndex = getNodePortIndex(node, side, portId)
  const portY = getPortYOffset(portIndex, portCount, height)

  if (side === "input") {
    return clampNodePosition(worldPoint.x, worldPoint.y - portY, node)
  }

  return clampNodePosition(worldPoint.x - width, worldPoint.y - portY, node)
}

function resolveCompatiblePortId(
  node: WorkflowNode,
  side: "input" | "output",
  requiredType: PortType
) {
  const definition = resolveNodeDefinition(node)
  const ports = side === "input" ? definition.inputs : definition.outputs
  return ports.find((port) => port.type === requiredType)?.id ?? ports[0]?.id
}

export function buildConnectedNodePlacement(
  catalogItemId: string,
  worldPoint: { x: number; y: number },
  draft: ConnectionDraft,
  anchorNode: WorkflowNode,
  existingEdges: WorkflowEdge[]
):
  | {
      node: WorkflowNode
      edge: WorkflowEdge
    }
  | null {
  const catalogItem = getComponentCatalogItemById(catalogItemId)
  if (!catalogItem) {
    return null
  }

  const requiredType = resolvePortType(anchorNode, draft.side, draft.portId)
  if (!requiredType) {
    return null
  }

  if (!catalogItemSupportsDraft(catalogItem, draft, requiredType)) {
    return null
  }

  const baseNode = createNodeFromCatalogItem(catalogItem)

  if (draft.side === "output") {
    const sourcePortId = resolveOutputPortId(anchorNode, draft.portId)
    const targetPortId = resolveCompatiblePortId(baseNode, "input", requiredType)
    if (!targetPortId) {
      return null
    }

    const node: WorkflowNode = {
      ...baseNode,
      position: positionNodeForPortAtPoint(
        baseNode,
        "input",
        targetPortId,
        worldPoint
      ),
    }

    const edge = sanitizeManualEdge(
      existingEdges,
      anchorNode,
      node,
      sourcePortId,
      targetPortId
    )

    return edge ? { node, edge } : null
  }

  const targetPortId = resolveInputPortId(anchorNode, draft.portId)
  const sourcePortId = resolveCompatiblePortId(baseNode, "output", requiredType)
  if (!sourcePortId) {
    return null
  }

  const node: WorkflowNode = {
    ...baseNode,
    position: positionNodeForPortAtPoint(
      baseNode,
      "output",
      sourcePortId,
      worldPoint
    ),
  }

  const edge = sanitizeManualEdge(
    existingEdges,
    node,
    anchorNode,
    sourcePortId,
    targetPortId
  )

  return edge ? { node, edge } : null
}
