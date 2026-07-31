"use client"

import * as React from "react"

import { buildEdgeConnectionPath } from "@/lib/design/layout-utils"
import type { WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import { cn } from "@amakai/shared/lib/utils"

const EDGE_HIT_STROKE_WIDTH = 16

export interface CanvasWorkflowEdgeProps {
  edge: WorkflowEdge
  from: WorkflowNode
  to: WorkflowNode
  isSelected: boolean
  isActive?: boolean
  onSelect: (edgeId: string) => void
}

export function CanvasWorkflowEdge({
  edge,
  from,
  to,
  isSelected,
  isActive = false,
  onSelect,
}: CanvasWorkflowEdgeProps) {
  const path = buildEdgeConnectionPath(from, to, edge)

  const handlePointerDown = (event: React.PointerEvent<SVGPathElement>) => {
    if (event.button !== 0) {
      return
    }

    event.stopPropagation()
    onSelect(edge.id)
  }

  return (
    <g data-edge-id={edge.id}>
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={EDGE_HIT_STROKE_WIDTH}
        className="cursor-pointer"
        onPointerDown={handlePointerDown}
      />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={isSelected || isActive ? 3 : 2}
        className={cn(
          "pointer-events-none transition-colors duration-300",
          isActive && "text-chart-2",
          isSelected && !isActive && "text-primary",
          !isSelected && !isActive && "text-border"
        )}
      />
    </g>
  )
}
