"use client"

import * as React from "react"
import { DotsSixVerticalIcon, XIcon } from "@phosphor-icons/react"

import { NodeInspector } from "@/components/design/node-inspector"
import type { Workflow, WorkflowNode } from "@/lib/domain/workflow"
import { Button } from "@amakai/shared/components/ui/button"
import { cn } from "@amakai/shared/lib/utils"

const DEFAULT_POSITION = { x: 12, y: 120 }

export interface EditorNodeInspectorPanelProps {
  open: boolean
  onClose: () => void
  workflow: Workflow
  node: WorkflowNode | null
  selectedCount: number
  onLabelChange: (label: string) => void
  onConfigChange: (key: string, value: unknown) => void
  onRemove: () => void
  className?: string
}

type DragState = {
  pointerId: number
  startX: number
  startY: number
  originX: number
  originY: number
}

function clampPosition(
  x: number,
  y: number,
  panel: HTMLDivElement | null,
  parent: HTMLElement | null
) {
  if (!panel || !parent) {
    return { x, y }
  }

  const maxX = Math.max(0, parent.clientWidth - panel.offsetWidth)
  const maxY = Math.max(0, parent.clientHeight - panel.offsetHeight)

  return {
    x: Math.min(maxX, Math.max(0, x)),
    y: Math.min(maxY, Math.max(0, y)),
  }
}

export function EditorNodeInspectorPanel({
  open,
  onClose,
  workflow,
  node,
  selectedCount,
  onLabelChange,
  onConfigChange,
  onRemove,
  className,
}: EditorNodeInspectorPanelProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const dragRef = React.useRef<DragState | null>(null)
  const [position, setPosition] = React.useState(DEFAULT_POSITION)
  const [isDragging, setIsDragging] = React.useState(false)

  const clampToContainer = React.useCallback((x: number, y: number) => {
    const panel = panelRef.current
    const parent = panel?.offsetParent as HTMLElement | null
    return clampPosition(x, y, panel, parent)
  }, [])

  React.useLayoutEffect(() => {
    if (!open) {
      return
    }

    setPosition((current) => clampToContainer(current.x, current.y))
  }, [clampToContainer, open])

  React.useEffect(() => {
    if (!open) {
      return
    }

    const onResize = () => {
      setPosition((current) => clampToContainer(current.x, current.y))
    }

    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [clampToContainer, open])

  const handleDragPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return
    }

    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    }
    setIsDragging(true)
  }

  const handleDragPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()
    setPosition(
      clampToContainer(
        drag.originX + event.clientX - drag.startX,
        drag.originY + event.clientY - drag.startY
      )
    )
  }

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    dragRef.current = null
    setIsDragging(false)
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  if (!open || selectedCount === 0) {
    return null
  }

  return (
    <div
      ref={panelRef}
      style={{ left: position.x, top: position.y }}
      className={cn(
        "pointer-events-auto absolute z-30 flex max-h-[min(75vh,calc(100%-1.5rem))] w-[min(calc(100%-1.5rem),340px)] min-h-0 flex-col overflow-hidden rounded-none border bg-background shadow-md",
        isDragging && "select-none",
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 touch-none items-center gap-1 border-b px-1 py-1",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="flex flex-1 items-center px-1 text-muted-foreground">
          <DotsSixVerticalIcon className="size-4 shrink-0" aria-hidden />
          <span className="sr-only">Drag to move inspector</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
          aria-label="Close inspector"
        >
          <XIcon />
        </Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <NodeInspector
          node={node}
          workflow={workflow}
          selectedCount={selectedCount}
          onLabelChange={onLabelChange}
          onConfigChange={onConfigChange}
          onRemove={onRemove}
        />
      </div>
    </div>
  )
}
