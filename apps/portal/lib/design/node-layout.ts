import type { WorkflowNode } from "@/lib/domain/workflow"
import { resolveNodeDefinition } from "@/lib/design/resolve-node-definition"

export const CANVAS_NODE_MIN_WIDTH = 220
export const CANVAS_NODE_MIN_HEIGHT = 72
export const CANVAS_NODE_MAX_WIDTH = 320
export const CANVAS_NODE_PORT_SPACING = 28
export const CANVAS_NODE_PORT_EDGE_PADDING = 24

/** @deprecated Use getNodeDimensions(node).width */
export const CANVAS_NODE_WIDTH = CANVAS_NODE_MIN_WIDTH

/** @deprecated Use getNodeDimensions(node).height */
export const CANVAS_NODE_HEIGHT = CANVAS_NODE_MIN_HEIGHT

export type NodeDimensions = {
  width: number
  height: number
}

export function getNodePortCount(node: WorkflowNode, side: "input" | "output") {
  const definition = resolveNodeDefinition(node)
  const ports = side === "input" ? definition.inputs : definition.outputs
  return ports.length
}

export function getMaxNodePortCount(node: WorkflowNode) {
  return Math.max(
    getNodePortCount(node, "input"),
    getNodePortCount(node, "output"),
    1
  )
}

export function getNodeDimensions(node: WorkflowNode): NodeDimensions {
  const maxPorts = getMaxNodePortCount(node)
  const heightForPorts =
    maxPorts <= 1
      ? CANVAS_NODE_MIN_HEIGHT
      : CANVAS_NODE_PORT_EDGE_PADDING * 2 +
        (maxPorts - 1) * CANVAS_NODE_PORT_SPACING

  const labelWidth = node.label.length * 7 + 96
  const width = Math.min(
    CANVAS_NODE_MAX_WIDTH,
    Math.max(CANVAS_NODE_MIN_WIDTH, labelWidth)
  )

  return {
    width,
    height: Math.max(CANVAS_NODE_MIN_HEIGHT, heightForPorts),
  }
}

export function getPortYOffset(
  portIndex: number,
  portCount: number,
  nodeHeight: number
) {
  if (portCount <= 1) {
    return nodeHeight / 2
  }

  const usableHeight = nodeHeight - CANVAS_NODE_PORT_EDGE_PADDING * 2
  const step = usableHeight / (portCount - 1)
  return CANVAS_NODE_PORT_EDGE_PADDING + step * portIndex
}

export function getNodePortId(
  node: WorkflowNode,
  side: "input" | "output",
  portIndex: number
) {
  const definition = resolveNodeDefinition(node)
  const ports = side === "input" ? definition.inputs : definition.outputs
  return ports[portIndex]?.id
}

export function getNodePortIndex(
  node: WorkflowNode,
  side: "input" | "output",
  portId?: string
) {
  if (!portId) {
    return 0
  }

  const definition = resolveNodeDefinition(node)
  const ports = side === "input" ? definition.inputs : definition.outputs
  const index = ports.findIndex((port) => port.id === portId)
  return index >= 0 ? index : 0
}

export function getNodePortPosition(
  node: WorkflowNode,
  side: "input" | "output",
  portIndex = 0
) {
  const definition = resolveNodeDefinition(node)
  const ports = side === "input" ? definition.inputs : definition.outputs
  const { width, height } = getNodeDimensions(node)
  const x = node.position?.x ?? 0
  const y = node.position?.y ?? 0

  if (ports.length === 0) {
    return {
      x: side === "input" ? x : x + width,
      y: y + height / 2,
    }
  }

  const clampedIndex = Math.min(Math.max(portIndex, 0), ports.length - 1)
  const portY = y + getPortYOffset(clampedIndex, ports.length, height)

  return {
    x: side === "input" ? x : x + width,
    y: portY,
  }
}

export function resolveOutputPortId(
  node: WorkflowNode,
  portId?: string
) {
  const definition = resolveNodeDefinition(node)
  const firstOutput = definition.outputs[0]?.id

  if (!portId || portId === "main-out") {
    return firstOutput ?? "main-out"
  }

  return portId
}

export function resolveInputPortId(node: WorkflowNode, portId?: string) {
  const definition = resolveNodeDefinition(node)
  const firstInput = definition.inputs[0]?.id

  if (!portId || portId === "main-in") {
    return firstInput ?? "main-in"
  }

  return portId
}

export function getNodePortPositionById(
  node: WorkflowNode,
  side: "input" | "output",
  portId?: string
) {
  const resolvedPortId =
    side === "input"
      ? resolveInputPortId(node, portId)
      : resolveOutputPortId(node, portId)

  return getNodePortPosition(
    node,
    side,
    getNodePortIndex(node, side, resolvedPortId)
  )
}
