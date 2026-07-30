"use client"

import * as React from "react"
import {
  GitBranchIcon,
  LightningIcon,
  PlayIcon,
  RepeatIcon,
  ShieldCheckIcon,
  WarningIcon,
} from "@phosphor-icons/react"

import { StatusBadge } from "@/components/portal/status-badge"
import {
  CANVAS_NODE_HEIGHT,
  CANVAS_NODE_WIDTH,
} from "@/lib/design/layout-utils"
import type { NodeKind, WorkflowNode } from "@/lib/domain/workflow"
import { cn } from "@amakai/shared/lib/utils"

const NODE_ICONS: Record<NodeKind, React.ElementType> = {
  trigger: PlayIcon,
  sequential: LightningIcon,
  parallel: GitBranchIcon,
  conditional: GitBranchIcon,
  loop: RepeatIcon,
  approval: ShieldCheckIcon,
  exception: WarningIcon,
}

export interface CanvasWorkflowNodeProps {
  node: WorkflowNode
  isSelected: boolean
  isConnectionSource: boolean
  isConnectionTarget: boolean
  zoom: number
  onSelect: (additive: boolean) => void
  onMove: (nodeId: string, deltaX: number, deltaY: number) => void
  onMoveEnd: () => void
  onPortPointerDown: (
    side: "input" | "output",
    event: React.PointerEvent<HTMLButtonElement>
  ) => void
}

export function CanvasWorkflowNode({
  node,
  isSelected,
  isConnectionSource,
  isConnectionTarget,
  zoom,
  onSelect,
  onMove,
  onMoveEnd,
  onPortPointerDown,
}: CanvasWorkflowNodeProps) {
  const Icon = NODE_ICONS[node.kind]
  const x = node.position?.x ?? 0
  const y = node.position?.y ?? 0

  const handleBodyPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }

    event.stopPropagation()
    onSelect(event.shiftKey)

    const target = event.currentTarget
    target.setPointerCapture(event.pointerId)

    const startX = event.clientX
    const startY = event.clientY

    const handlePointerMove = (moveEvent: PointerEvent) => {
      onMove(
        node.id,
        (moveEvent.clientX - startX) / zoom,
        (moveEvent.clientY - startY) / zoom
      )
    }

    const handlePointerUp = () => {
      target.releasePointerCapture(event.pointerId)
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
      onMoveEnd()
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)
  }

  return (
    <div
      className="absolute touch-none select-none"
      style={{
        width: CANVAS_NODE_WIDTH,
        height: CANVAS_NODE_HEIGHT,
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      <button
        type="button"
        aria-label={`Connect input to ${node.label}`}
        className={cn(
          "absolute top-1/2 -left-2 z-10 size-4 -translate-y-1/2 rounded-full border-2 bg-background transition-colors",
          isConnectionTarget
            ? "border-primary bg-primary/20"
            : "border-muted-foreground/40 hover:border-primary"
        )}
        onPointerDown={(event) => onPortPointerDown("input", event)}
      />

      <button
        type="button"
        aria-label={`Connect output from ${node.label}`}
        className={cn(
          "absolute top-1/2 -right-2 z-10 size-4 -translate-y-1/2 rounded-full border-2 bg-background transition-colors",
          isConnectionSource
            ? "border-primary bg-primary/20"
            : "border-primary/50 hover:border-primary"
        )}
        onPointerDown={(event) => onPortPointerDown("output", event)}
      />

      <div
        className={cn(
          "relative flex h-full cursor-grab items-center gap-3 rounded-none border bg-background px-3 shadow-sm active:cursor-grabbing",
          isSelected && "border-primary ring-2 ring-primary/20",
          isConnectionSource && "border-primary/60"
        )}
        onPointerDown={handleBodyPointerDown}
      >
        <div className="flex size-9 shrink-0 items-center justify-center rounded-none bg-muted">
          <Icon className="text-foreground" />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium">{node.label}</span>
          <StatusBadge status={node.kind} label={node.kind} className="w-fit" />
        </div>
      </div>
    </div>
  )
}
