import type { WorkflowNode } from "@/lib/domain/workflow"
import {
  CANVAS_NODE_MIN_HEIGHT,
  CANVAS_NODE_MIN_WIDTH,
  getNodeDimensions,
} from "@/lib/design/node-layout"

export const CANVAS_NODE_WIDTH = CANVAS_NODE_MIN_WIDTH
export const CANVAS_NODE_HEIGHT = CANVAS_NODE_MIN_HEIGHT
export const CANVAS_NODE_ORIGIN_X = 80
export const CANVAS_NODE_ORIGIN_Y = 160

export type CanvasViewport = {
  x: number
  y: number
  zoom: number
}

export type CanvasBounds = {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export const CANVAS_MIN_ZOOM = 0.25
export const CANVAS_MAX_ZOOM = 2
export const CANVAS_ZOOM_STEP = 0.1
export const CANVAS_WORLD_WIDTH = 7200
export const CANVAS_WORLD_HEIGHT = 5400
export const CANVAS_WORLD_MIN_WIDTH = CANVAS_WORLD_WIDTH
export const CANVAS_WORLD_MIN_HEIGHT = CANVAS_WORLD_HEIGHT
export const CANVAS_WORLD_PADDING = 240
export const CANVAS_VIEWPORT_EDGE_PADDING = 48
export const CANVAS_NODE_EDGE_PADDING = 24

export function clampZoom(zoom: number) {
  return Math.min(CANVAS_MAX_ZOOM, Math.max(CANVAS_MIN_ZOOM, zoom))
}

export function getCanvasWorldBounds(): CanvasBounds {
  return {
    minX: 0,
    minY: 0,
    maxX: CANVAS_WORLD_WIDTH,
    maxY: CANVAS_WORLD_HEIGHT,
    width: CANVAS_WORLD_WIDTH,
    height: CANVAS_WORLD_HEIGHT,
  }
}

export function getNodesContentBounds(nodes: WorkflowNode[]): CanvasBounds {
  if (nodes.length === 0) {
    const minX = CANVAS_NODE_ORIGIN_X - CANVAS_WORLD_PADDING
    const minY = CANVAS_NODE_ORIGIN_Y - CANVAS_WORLD_PADDING
    const maxX =
      CANVAS_NODE_ORIGIN_X + CANVAS_NODE_WIDTH + CANVAS_WORLD_PADDING
    const maxY =
      CANVAS_NODE_ORIGIN_Y + CANVAS_NODE_HEIGHT + CANVAS_WORLD_PADDING

    return {
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    }
  }

  const minX = Math.min(...nodes.map((node) => node.position?.x ?? 0))
  const minY = Math.min(...nodes.map((node) => node.position?.y ?? 0))
  const maxX = Math.max(
    ...nodes.map((node) => {
      const { width } = getNodeDimensions(node)
      return (node.position?.x ?? 0) + width
    })
  )
  const maxY = Math.max(
    ...nodes.map((node) => {
      const { height } = getNodeDimensions(node)
      return (node.position?.y ?? 0) + height
    })
  )

  const paddedMinX = minX - CANVAS_WORLD_PADDING
  const paddedMinY = minY - CANVAS_WORLD_PADDING
  const paddedMaxX = maxX + CANVAS_WORLD_PADDING
  const paddedMaxY = maxY + CANVAS_WORLD_PADDING

  return {
    minX: paddedMinX,
    minY: paddedMinY,
    maxX: paddedMaxX,
    maxY: paddedMaxY,
    width: paddedMaxX - paddedMinX,
    height: paddedMaxY - paddedMinY,
  }
}

export function clampViewportToWorld(
  viewport: CanvasViewport,
  worldWidth: number,
  worldHeight: number,
  containerWidth: number,
  containerHeight: number,
  edgePadding = CANVAS_VIEWPORT_EDGE_PADDING
): CanvasViewport {
  if (containerWidth <= 0 || containerHeight <= 0) {
    return viewport
  }

  const worldScreenWidth = worldWidth * viewport.zoom
  const worldScreenHeight = worldHeight * viewport.zoom

  let minX: number
  let maxX: number
  let minY: number
  let maxY: number

  if (worldScreenWidth <= containerWidth - edgePadding * 2) {
    const centeredX = (containerWidth - worldScreenWidth) / 2
    minX = centeredX
    maxX = centeredX
  } else {
    maxX = edgePadding
    minX = containerWidth - edgePadding - worldScreenWidth
  }

  if (worldScreenHeight <= containerHeight - edgePadding * 2) {
    const centeredY = (containerHeight - worldScreenHeight) / 2
    minY = centeredY
    maxY = centeredY
  } else {
    maxY = edgePadding
    minY = containerHeight - edgePadding - worldScreenHeight
  }

  return {
    ...viewport,
    x: Math.min(maxX, Math.max(minX, viewport.x)),
    y: Math.min(maxY, Math.max(minY, viewport.y)),
  }
}

export function screenToWorld(
  viewport: CanvasViewport,
  containerRect: DOMRect,
  clientX: number,
  clientY: number
) {
  return {
    x: (clientX - containerRect.left - viewport.x) / viewport.zoom,
    y: (clientY - containerRect.top - viewport.y) / viewport.zoom,
  }
}

export function computeCenterOnWorldViewport(
  containerWidth: number,
  containerHeight: number,
  options?: {
    zoom?: number
    focusX?: number
    focusY?: number
  }
): CanvasViewport {
  const zoom = options?.zoom ?? 1
  const focusX = options?.focusX ?? CANVAS_WORLD_WIDTH / 2
  const focusY = options?.focusY ?? CANVAS_WORLD_HEIGHT / 2

  return {
    zoom,
    x: containerWidth / 2 - focusX * zoom,
    y: containerHeight / 2 - focusY * zoom,
  }
}

export function computeFitViewport(
  nodes: WorkflowNode[],
  containerWidth: number,
  containerHeight: number
): CanvasViewport {
  if (nodes.length === 0) {
    return computeCenterOnWorldViewport(containerWidth, containerHeight)
  }

  const box = getNodesContentBounds(nodes)
  const padding = 96
  const contentWidth = box.width + padding * 2
  const contentHeight = box.height + padding * 2
  const zoom = clampZoom(
    Math.min(containerWidth / contentWidth, containerHeight / contentHeight, 1)
  )

  const x =
    (containerWidth - box.width * zoom) / 2 - box.minX * zoom
  const y =
    (containerHeight - box.height * zoom) / 2 - box.minY * zoom

  return { x, y, zoom }
}

export function zoomAtPoint(
  viewport: CanvasViewport,
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  nextZoom: number
): CanvasViewport {
  const clamped = clampZoom(nextZoom)
  const worldX = (clientX - containerRect.left - viewport.x) / viewport.zoom
  const worldY = (clientY - containerRect.top - viewport.y) / viewport.zoom

  return {
    zoom: clamped,
    x: clientX - containerRect.left - worldX * clamped,
    y: clientY - containerRect.top - worldY * clamped,
  }
}

export function nodeIntersectsRect(
  node: WorkflowNode,
  rect: { x: number; y: number; width: number; height: number }
) {
  const nx = node.position?.x ?? 0
  const ny = node.position?.y ?? 0
  const { width, height } = getNodeDimensions(node)

  return (
    nx < rect.x + rect.width &&
    nx + width > rect.x &&
    ny < rect.y + rect.height &&
    ny + height > rect.y
  )
}

export function clampNodePositionToWorld(
  x: number,
  y: number,
  node?: WorkflowNode
) {
  const { width, height } = node
    ? getNodeDimensions(node)
    : { width: CANVAS_NODE_WIDTH, height: CANVAS_NODE_HEIGHT }
  const maxX = CANVAS_WORLD_WIDTH - width - CANVAS_NODE_EDGE_PADDING
  const maxY = CANVAS_WORLD_HEIGHT - height - CANVAS_NODE_EDGE_PADDING

  return {
    x: Math.min(maxX, Math.max(CANVAS_NODE_EDGE_PADDING, x)),
    y: Math.min(maxY, Math.max(CANVAS_NODE_EDGE_PADDING, y)),
  }
}
