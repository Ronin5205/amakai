import type { WorkflowNode } from "@/lib/domain/workflow"
import {
  CANVAS_NODE_HEIGHT,
  CANVAS_NODE_ORIGIN_X,
  CANVAS_NODE_ORIGIN_Y,
  CANVAS_NODE_WIDTH,
  clampNodePositionToWorld,
} from "@/lib/design/canvas-viewport"

export {
  CANVAS_NODE_HEIGHT,
  CANVAS_NODE_WIDTH,
  CANVAS_NODE_ORIGIN_X,
  CANVAS_NODE_ORIGIN_Y,
} from "@/lib/design/canvas-viewport"

export const CANVAS_NODE_GAP_X = 100

export function layoutNodesHorizontally(nodes: WorkflowNode[]): WorkflowNode[] {
  return nodes.map((node, index) => ({
    ...node,
    position: {
      x: CANVAS_NODE_ORIGIN_X + index * (CANVAS_NODE_WIDTH + CANVAS_NODE_GAP_X),
      y: node.position?.y ?? CANVAS_NODE_ORIGIN_Y,
    },
  }))
}

export function ensureNodePositions(nodes: WorkflowNode[]): WorkflowNode[] {
  const needsLayout = nodes.some((node) => !node.position)
  if (needsLayout) {
    return layoutNodesHorizontally(nodes)
  }
  return nodes
}

export function getNodePortPosition(
  node: WorkflowNode,
  side: "input" | "output"
) {
  const x = node.position?.x ?? 0
  const y = node.position?.y ?? 0

  return {
    x: side === "input" ? x : x + CANVAS_NODE_WIDTH,
    y: y + CANVAS_NODE_HEIGHT / 2,
  }
}

export function buildEdgeConnectionPath(
  from: WorkflowNode,
  to: WorkflowNode
) {
  const start = getNodePortPosition(from, "output")
  const end = getNodePortPosition(to, "input")
  const controlOffset = Math.max(48, Math.abs(end.x - start.x) / 2)

  return `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`
}

export function clampNodePosition(x: number, y: number) {
  return clampNodePositionToWorld(x, y)
}
