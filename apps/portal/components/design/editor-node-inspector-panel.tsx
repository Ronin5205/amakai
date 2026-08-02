"use client"

import * as React from "react"
import {
  CornersInIcon,
  CornersOutIcon,
  DotsSixVerticalIcon,
  XIcon,
} from "@phosphor-icons/react"

import { NodeInspector } from "@/components/design/node-inspector"
import type { Workflow, WorkflowNode } from "@/lib/domain/workflow"
import type { DataTableSummary } from "@/lib/domain/data-table"
import type { PlaygroundStep } from "@/lib/engine/types"
import {
  clampInspectorPosition,
  computeOppositeInspectorPosition,
  INSPECTOR_DEFAULT_TOP,
  INSPECTOR_EDGE_MARGIN,
  type InspectorAnchorScreen,
} from "@/lib/design/inspector-placement"
import { Button } from "@amakai/shared/components/ui/button"
import { cn } from "@amakai/shared/lib/utils"

type InspectorSizeMode = "default" | "maximized"

export interface EditorNodeInspectorPanelProps {
  open: boolean
  onClose: () => void
  workflow: Workflow
  node: WorkflowNode | null
  selectedCount: number
  anchorScreen: InspectorAnchorScreen | null
  dataTables?: DataTableSummary[]
  validationSteps?: PlaygroundStep[]
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

export function EditorNodeInspectorPanel({
  open,
  onClose,
  workflow,
  node,
  selectedCount,
  anchorScreen,
  dataTables,
  validationSteps,
  onLabelChange,
  onConfigChange,
  onRemove,
  className,
}: EditorNodeInspectorPanelProps) {
  const panelRef = React.useRef<HTMLDivElement>(null)
  const dragRef = React.useRef<DragState | null>(null)
  const manualPositionRef = React.useRef(false)
  const anchorNodeIdRef = React.useRef<string | null>(null)
  const [position, setPosition] = React.useState({
    x: INSPECTOR_EDGE_MARGIN,
    y: INSPECTOR_DEFAULT_TOP,
  })
  const [isDragging, setIsDragging] = React.useState(false)
  const [sizeMode, setSizeMode] = React.useState<InspectorSizeMode>("default")
  const restoredPositionRef = React.useRef({
    x: INSPECTOR_EDGE_MARGIN,
    y: INSPECTOR_DEFAULT_TOP,
  })

  const isMaximized = sizeMode === "maximized"

  const applyAutoPosition = React.useCallback(() => {
    if (manualPositionRef.current || isMaximized) {
      return
    }

    const panel = panelRef.current
    const parent = panel?.offsetParent as HTMLElement | null
    const containerWidth =
      anchorScreen?.containerWidth ?? parent?.clientWidth ?? 0
    const containerHeight =
      anchorScreen?.containerHeight ?? parent?.clientHeight ?? 0
    const panelWidth = panel?.offsetWidth ?? Math.min(containerWidth, 512)
    const panelHeight = panel?.offsetHeight ?? 320

    if (anchorScreen && containerWidth > 0 && containerHeight > 0) {
      setPosition(
        computeOppositeInspectorPosition(
          anchorScreen,
          panelWidth,
          panelHeight
        )
      )
      return
    }

    setPosition(
      clampInspectorPosition(
        INSPECTOR_EDGE_MARGIN,
        INSPECTOR_DEFAULT_TOP,
        panelWidth,
        panelHeight,
        containerWidth,
        containerHeight
      )
    )
  }, [anchorScreen, isMaximized])

  React.useEffect(() => {
    if (!open) {
      setSizeMode("default")
      manualPositionRef.current = false
      anchorNodeIdRef.current = null
      setPosition({
        x: INSPECTOR_EDGE_MARGIN,
        y: INSPECTOR_DEFAULT_TOP,
      })
    }
  }, [open])

  React.useEffect(() => {
    const nextAnchorId = node?.id ?? null
    if (nextAnchorId !== anchorNodeIdRef.current) {
      anchorNodeIdRef.current = nextAnchorId
      manualPositionRef.current = false
    }
  }, [node?.id])

  React.useLayoutEffect(() => {
    if (!open || isMaximized) {
      return
    }

    applyAutoPosition()
  }, [applyAutoPosition, open, isMaximized, selectedCount])

  React.useEffect(() => {
    if (!open || isMaximized) {
      return
    }

    const onResize = () => {
      if (manualPositionRef.current) {
        const panel = panelRef.current
        const parent = panel?.offsetParent as HTMLElement | null
        if (!panel || !parent) {
          return
        }

        setPosition((current) =>
          clampInspectorPosition(
            current.x,
            current.y,
            panel.offsetWidth,
            panel.offsetHeight,
            parent.clientWidth,
            parent.clientHeight
          )
        )
        return
      }

      applyAutoPosition()
    }

    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [applyAutoPosition, isMaximized, open])

  const handleToggleMaximized = () => {
    if (isMaximized) {
      setSizeMode("default")
      setPosition(restoredPositionRef.current)
      return
    }

    restoredPositionRef.current = position
    setSizeMode("maximized")
  }

  const handleDragPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isMaximized || event.button !== 0) {
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
    manualPositionRef.current = true
    setIsDragging(true)
  }

  const handleDragPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    event.preventDefault()

    const panel = panelRef.current
    const parent = panel?.offsetParent as HTMLElement | null
    if (!panel || !parent) {
      return
    }

    setPosition(
      clampInspectorPosition(
        drag.originX + event.clientX - drag.startX,
        drag.originY + event.clientY - drag.startY,
        panel.offsetWidth,
        panel.offsetHeight,
        parent.clientWidth,
        parent.clientHeight
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
      style={isMaximized ? undefined : { left: position.x, top: position.y }}
      className={cn(
        "pointer-events-auto absolute z-30 flex min-h-0 flex-col overflow-hidden border bg-background shadow-md",
        isMaximized
          ? "inset-0 z-40 max-h-none w-full rounded-none border-0"
          : "max-h-[min(90vh,calc(100%-1.5rem))] w-[min(calc(100%-1.5rem),32rem)] rounded-none",
        isDragging && "select-none",
        className
      )}
    >
      <div
        className={cn(
          "flex shrink-0 touch-none items-center gap-1 border-b px-1 py-1",
          !isMaximized && (isDragging ? "cursor-grabbing" : "cursor-grab")
        )}
        onPointerDown={handleDragPointerDown}
        onPointerMove={handleDragPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="flex flex-1 items-center px-1 text-muted-foreground">
          {!isMaximized ? (
            <>
              <DotsSixVerticalIcon className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">Drag to move inspector</span>
            </>
          ) : (
            <span className="px-1 text-xs font-medium text-foreground">
              Node inspector
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={handleToggleMaximized}
          aria-label={isMaximized ? "Restore inspector size" : "Maximize inspector"}
          aria-pressed={isMaximized}
        >
          {isMaximized ? <CornersInIcon /> : <CornersOutIcon />}
        </Button>
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
          dataTables={dataTables}
          validationSteps={validationSteps}
          onLabelChange={onLabelChange}
          onConfigChange={onConfigChange}
          onRemove={onRemove}
        />
      </div>
    </div>
  )
}
