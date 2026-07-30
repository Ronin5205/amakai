import type { WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import {
  CANVAS_NODE_MIN_HEIGHT,
  CANVAS_NODE_MIN_WIDTH,
  getNodeDimensions,
  getNodePortPositionById,
} from "@/lib/design/node-layout"
import {
  CANVAS_NODE_ORIGIN_X,
  CANVAS_NODE_ORIGIN_Y,
  clampNodePositionToWorld,
} from "@/lib/design/canvas-viewport"

export {
  CANVAS_NODE_HEIGHT,
  CANVAS_NODE_MIN_HEIGHT,
  CANVAS_NODE_MIN_WIDTH,
  CANVAS_NODE_WIDTH,
  getNodeDimensions,
  getMaxNodePortCount,
  getNodePortCount,
  getNodePortId,
  getNodePortIndex,
  getNodePortPosition,
  getNodePortPositionById,
  getPortYOffset,
  resolveInputPortId,
  resolveOutputPortId,
} from "@/lib/design/node-layout"
export {
  CANVAS_NODE_ORIGIN_X,
  CANVAS_NODE_ORIGIN_Y,
} from "@/lib/design/canvas-viewport"

export const CANVAS_NODE_GAP_X = 100

export function layoutNodesHorizontally(nodes: WorkflowNode[]): WorkflowNode[] {
  let cursorX = CANVAS_NODE_ORIGIN_X

  return nodes.map((node) => {
    const { width } = getNodeDimensions(node)
    const positioned = {
      ...node,
      position: {
        x: cursorX,
        y: node.position?.y ?? CANVAS_NODE_ORIGIN_Y,
      },
    }
    cursorX += width + CANVAS_NODE_GAP_X
    return positioned
  })
}

export function ensureNodePositions(nodes: WorkflowNode[]): WorkflowNode[] {
  const needsLayout = nodes.some((node) => !node.position)
  if (needsLayout) {
    return layoutNodesHorizontally(nodes)
  }
  return nodes
}

export function buildEdgeConnectionPath(
  from: WorkflowNode,
  to: WorkflowNode,
  ports?: Pick<WorkflowEdge, "sourcePort" | "targetPort">
) {
  const start = getNodePortPositionById(from, "output", ports?.sourcePort)
  const end = getNodePortPositionById(to, "input", ports?.targetPort)
  const controlOffset = Math.max(48, Math.abs(end.x - start.x) / 2)

  return `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`
}

export function clampNodePosition(
  x: number,
  y: number,
  node?: WorkflowNode
) {
  return clampNodePositionToWorld(x, y, node)
}
