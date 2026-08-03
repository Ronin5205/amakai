import { getNodeDimensions } from "@/lib/design/node-layout"
import type { WorkflowNode } from "@/lib/domain/workflow"

export const INSPECTOR_EDGE_MARGIN = 12
export const INSPECTOR_DEFAULT_TOP = 120

export type InspectorAnchorScreen = {
  centerX: number
  topY: number
  containerWidth: number
  containerHeight: number
}

export function getInspectorAnchorScreen(
  node: WorkflowNode,
  viewport: { x: number; y: number; zoom: number },
  containerWidth: number,
  containerHeight: number
): Pick<InspectorAnchorScreen, "centerX" | "topY"> {
  const position = node.position ?? { x: 0, y: 0 }
  const { width, height } = getNodeDimensions(node)
  const scaledWidth = width * viewport.zoom
  const scaledHeight = height * viewport.zoom
  const left = position.x * viewport.zoom + viewport.x
  const top = position.y * viewport.zoom + viewport.y

  return {
    centerX: left + scaledWidth / 2,
    topY: top + Math.min(scaledHeight / 2, 48),
  }
}

export function computeOppositeInspectorPosition(
  anchor: InspectorAnchorScreen,
  panelWidth: number,
  panelHeight: number
) {
  const maxX = Math.max(
    INSPECTOR_EDGE_MARGIN,
    anchor.containerWidth - panelWidth - INSPECTOR_EDGE_MARGIN
  )
  const maxY = Math.max(
    INSPECTOR_EDGE_MARGIN,
    anchor.containerHeight - panelHeight - INSPECTOR_EDGE_MARGIN
  )

  const nodeOnLeft = anchor.centerX < anchor.containerWidth / 2
  const x = nodeOnLeft ? maxX : INSPECTOR_EDGE_MARGIN
  const preferredY = anchor.topY
  const y = Math.min(Math.max(INSPECTOR_EDGE_MARGIN, preferredY), maxY)

  return { x, y }
}

export function clampInspectorPosition(
  x: number,
  y: number,
  panelWidth: number,
  panelHeight: number,
  containerWidth: number,
  containerHeight: number
) {
  const maxX = Math.max(INSPECTOR_EDGE_MARGIN, containerWidth - panelWidth - INSPECTOR_EDGE_MARGIN)
  const maxY = Math.max(INSPECTOR_EDGE_MARGIN, containerHeight - panelHeight - INSPECTOR_EDGE_MARGIN)

  return {
    x: Math.min(maxX, Math.max(INSPECTOR_EDGE_MARGIN, x)),
    y: Math.min(maxY, Math.max(INSPECTOR_EDGE_MARGIN, y)),
  }
}
