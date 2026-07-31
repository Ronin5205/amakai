"use client"

import * as React from "react"
import { useDroppable } from "@dnd-kit/core"
import { HandIcon, PlusIcon, SelectionIcon } from "@phosphor-icons/react"

import {
  CanvasToolbar,
  type CanvasInteractionMode,
} from "@/components/design/canvas-toolbar"
import { CanvasWorkflowEdge } from "@/components/design/canvas-workflow-edge"
import { CanvasWorkflowNode } from "@/components/design/canvas-workflow-node"
import { useCanvasViewport } from "@/hooks/use-canvas-viewport"
import {
  ensureNodePositions,
  getNodePortPositionById,
} from "@/lib/design/layout-utils"
import {
  getNodePortId,
} from "@/lib/design/node-layout"
import {
  getCanvasWorldBounds,
  nodeIntersectsRect,
} from "@/lib/design/canvas-viewport"
import { CANVAS_DROP_ID } from "@/lib/design/design-hub-types"
import type { ConnectionDraft } from "@/lib/design/connection-draft"
import type { WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import type { NodeExecutionState } from "@/lib/engine/types"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@amakai/shared/components/ui/empty"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@amakai/shared/components/ui/tooltip"
import { cn } from "@amakai/shared/lib/utils"

export type CanvasViewportApi = {
  getWorldPoint: (clientX: number, clientY: number) => { x: number; y: number }
  getViewportCenter: () => { x: number; y: number }
}

export type WorkflowGraphControls = {
  cancelConnectionDraft: () => void
}

export interface WorkflowNodeGraphProps {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeIds: string[]
  selectedEdgeId: string | null
  canPaste: boolean
  canUndo: boolean
  canRedo: boolean
  onSelectEdge: (edgeId: string) => void
  onSelectNode: (nodeId: string | null, options?: { additive?: boolean }) => void
  onSelectNodes: (nodeIds: string[]) => void
  onConnectNodes: (
    source: string,
    target: string,
    sourcePort?: string,
    targetPort?: string
  ) => void
  onMoveNodes: (nodeIds: string[], deltaX: number, deltaY: number) => void
  onCopy: () => void
  onPaste: () => void
  onDuplicate: () => void
  onDelete: () => void
  onUndo: () => void
  onRedo: () => void
  onRegisterViewport?: (api: CanvasViewportApi) => void
  onRegisterGraphControls?: (controls: WorkflowGraphControls) => void
  onConnectionDraftCanvasClick?: (
    world: { x: number; y: number },
    draft: ConnectionDraft,
    screen: { clientX: number; clientY: number }
  ) => void
  onConnectionDraftCancel?: () => void
  fullBleed?: boolean
  nodeExecutionStates?: Record<string, NodeExecutionState>
  activeEdgeId?: string | null
}

type MarqueeState = {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

type ConnectionSource = ConnectionDraft

function buildPreviewConnectionPath(
  node: WorkflowNode,
  pointer: { x: number; y: number },
  side: "input" | "output",
  portId?: string
) {
  const anchor = getNodePortPositionById(node, side, portId)
  const start = side === "output" ? anchor : pointer
  const end = side === "output" ? pointer : anchor
  const controlOffset = Math.max(48, Math.abs(end.x - start.x) / 2)

  return `M ${start.x} ${start.y} C ${start.x + controlOffset} ${start.y}, ${end.x - controlOffset} ${end.y}, ${end.x} ${end.y}`
}

type NodeDragState = {
  nodeIds: string[]
  deltaX: number
  deltaY: number
}

function applyNodeDrag(nodes: WorkflowNode[], drag: NodeDragState | null) {
  if (!drag) {
    return nodes
  }

  const idSet = new Set(drag.nodeIds)

  return nodes.map((node) => {
    if (!idSet.has(node.id) || !node.position) {
      return node
    }

    return {
      ...node,
      position: {
        x: node.position.x + drag.deltaX,
        y: node.position.y + drag.deltaY,
      },
    }
  })
}

export function WorkflowNodeGraph({
  nodes,
  edges,
  selectedNodeIds,
  selectedEdgeId,
  canPaste,
  canUndo,
  canRedo,
  onSelectEdge,
  onSelectNode,
  onSelectNodes,
  onConnectNodes,
  onMoveNodes,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
  onUndo,
  onRedo,
  onRegisterViewport,
  onRegisterGraphControls,
  onConnectionDraftCanvasClick,
  onConnectionDraftCancel,
  fullBleed = false,
  nodeExecutionStates = {},
  activeEdgeId = null,
}: WorkflowNodeGraphProps) {
  const [canvasMode, setCanvasMode] =
    React.useState<CanvasInteractionMode>("select")
  const [spacePanActive, setSpacePanActive] = React.useState(false)
  const marqueeRef = React.useRef<MarqueeState | null>(null)
  const [marquee, setMarquee] = React.useState<MarqueeState | null>(null)
  const draggingIdsRef = React.useRef<string[]>([])
  const isDraggingNodesRef = React.useRef(false)
  const [nodeDrag, setNodeDrag] = React.useState<NodeDragState | null>(null)
  const pendingDragRef = React.useRef<NodeDragState | null>(null)
  const dragFrameRef = React.useRef<number | null>(null)
  const [connectionSource, setConnectionSource] =
    React.useState<ConnectionSource | null>(null)
  const [connectionPreview, setConnectionPreview] = React.useState<{
    x: number
    y: number
  } | null>(null)
  const [connectionPreviewLocked, setConnectionPreviewLocked] =
    React.useState(false)

  const { setNodeRef, isOver } = useDroppable({ id: CANVAS_DROP_ID })
  const positionedNodes = ensureNodePositions(nodes)
  const displayNodes = React.useMemo(
    () => applyNodeDrag(positionedNodes, nodeDrag),
    [nodeDrag, positionedNodes]
  )
  const worldBounds = getCanvasWorldBounds()
  const {
    containerRef,
    viewport,
    handleWheel,
    startPan,
    movePan,
    endPan,
    zoomIn,
    zoomOut,
    resetZoom,
    fitToContent,
    getWorldPoint,
    getViewportCenterWorldPoint,
    isSpacePressed,
  } = useCanvasViewport(positionedNodes, worldBounds)

  React.useEffect(() => {
    return () => {
      if (dragFrameRef.current !== null) {
        window.cancelAnimationFrame(dragFrameRef.current)
      }
    }
  }, [])

  const scheduleDragUpdate = React.useCallback((next: NodeDragState) => {
    pendingDragRef.current = next

    if (dragFrameRef.current !== null) {
      return
    }

    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null
      const pending = pendingDragRef.current
      if (pending) {
        setNodeDrag(pending)
      }
    })
  }, [])

  const nodeById = React.useMemo(
    () => new Map(displayNodes.map((node) => [node.id, node])),
    [displayNodes]
  )

  const isPanning =
    canvasMode === "pan" || spacePanActive || isSpacePressed()

  React.useLayoutEffect(() => {
    fitToContent()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    onRegisterViewport?.({
      getWorldPoint,
      getViewportCenter: getViewportCenterWorldPoint,
    })
  }, [getViewportCenterWorldPoint, getWorldPoint, onRegisterViewport])

  React.useEffect(() => {
    if (!connectionSource || connectionPreviewLocked) {
      return
    }

    const onPointerMove = (event: PointerEvent) => {
      setConnectionPreview(getWorldPoint(event.clientX, event.clientY))
    }

    window.addEventListener("pointermove", onPointerMove)
    return () => window.removeEventListener("pointermove", onPointerMove)
  }, [connectionPreviewLocked, connectionSource, getWorldPoint])

  const cancelConnection = React.useCallback(() => {
    setConnectionSource(null)
    setConnectionPreview(null)
    setConnectionPreviewLocked(false)
    onConnectionDraftCancel?.()
  }, [onConnectionDraftCancel])

  React.useEffect(() => {
    onRegisterGraphControls?.({ cancelConnectionDraft: cancelConnection })
  }, [cancelConnection, onRegisterGraphControls])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return
      }

      if (event.code === "Space") {
        event.preventDefault()
        setSpacePanActive(true)
        return
      }

      const mod = event.metaKey || event.ctrlKey
      if (mod && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault()
        onRedo()
        return
      }
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault()
        onUndo()
        return
      }
      if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault()
        onRedo()
        return
      }
      if (mod && event.key.toLowerCase() === "c") {
        event.preventDefault()
        onCopy()
      }
      if (mod && event.key.toLowerCase() === "v") {
        event.preventDefault()
        onPaste()
      }
      if (mod && event.key.toLowerCase() === "d") {
        event.preventDefault()
        onDuplicate()
      }
      if (mod && event.key.toLowerCase() === "a") {
        event.preventDefault()
        onSelectNodes(positionedNodes.map((node) => node.id))
      }
      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault()
        onDelete()
      }
      if (event.key === "Escape" && connectionSource) {
        event.preventDefault()
        cancelConnection()
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setSpacePanActive(false)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [
    onCopy,
    onDelete,
    onDuplicate,
    onPaste,
    onRedo,
    onUndo,
    cancelConnection,
    connectionSource,
    onSelectNodes,
    positionedNodes,
  ])

  const handleNodeSelect = (nodeId: string, additive: boolean) => {
    if (canvasMode === "pan") {
      return
    }
    onSelectNode(nodeId, { additive })
  }

  const handleEdgeSelect = (edgeId: string) => {
    if (canvasMode === "pan") {
      return
    }
    onSelectEdge(edgeId)
  }

  const handleNodeMoveStart = (nodeId: string) => {
    draggingIdsRef.current = selectedNodeIds.includes(nodeId)
      ? selectedNodeIds
      : [nodeId]
    pendingDragRef.current = null
    setNodeDrag(null)
  }

  const handleNodeMove = (nodeId: string, deltaX: number, deltaY: number) => {
    if (!isDraggingNodesRef.current) {
      handleNodeMoveStart(nodeId)
      isDraggingNodesRef.current = true
    }

    scheduleDragUpdate({
      nodeIds: draggingIdsRef.current,
      deltaX,
      deltaY,
    })
  }

  const handleNodeMoveEnd = () => {
    const pending = pendingDragRef.current ?? nodeDrag

    if (pending && (pending.deltaX !== 0 || pending.deltaY !== 0)) {
      onMoveNodes(pending.nodeIds, pending.deltaX, pending.deltaY)
    }

    pendingDragRef.current = null
    setNodeDrag(null)

    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current)
      dragFrameRef.current = null
    }

    draggingIdsRef.current = []
    isDraggingNodesRef.current = false
  }

  const handlePortPointerDown = (
    nodeId: string,
    side: "input" | "output",
    event: React.PointerEvent<HTMLButtonElement>,
    portIndex = 0
  ) => {
    event.stopPropagation()

    const node = nodeById.get(nodeId)
    if (!node) {
      return
    }

    const portId = getNodePortId(node, side, portIndex)

    if (side === "output") {
      if (
        connectionSource?.side === "input" &&
        connectionSource.nodeId !== nodeId
      ) {
        onConnectNodes(
          nodeId,
          connectionSource.nodeId,
          portId,
          connectionSource.portId
        )
        cancelConnection()
        return
      }

      setConnectionSource({ nodeId, portId, side: "output" })
      setConnectionPreview(getWorldPoint(event.clientX, event.clientY))
      setConnectionPreviewLocked(false)
      return
    }

    if (
      connectionSource?.side === "output" &&
      connectionSource.nodeId !== nodeId
    ) {
      onConnectNodes(
        connectionSource.nodeId,
        nodeId,
        connectionSource.portId,
        portId
      )
      cancelConnection()
      return
    }

    setConnectionSource({ nodeId, portId, side: "input" })
    setConnectionPreview(getWorldPoint(event.clientX, event.clientY))
    setConnectionPreviewLocked(false)
  }

  const handleCanvasPointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (
      startPan(event, {
        panMode: canvasMode === "pan" && event.button === 0,
      })
    ) {
      return
    }

    if (event.button !== 0 || isPanning) {
      return
    }

    const world = getWorldPoint(event.clientX, event.clientY)
    marqueeRef.current = {
      startX: world.x,
      startY: world.y,
      currentX: world.x,
      currentY: world.y,
    }
    setMarquee(marqueeRef.current)
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handleCanvasPointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    movePan(event)

    const currentMarquee = marqueeRef.current
    if (!currentMarquee) {
      return
    }

    const world = getWorldPoint(event.clientX, event.clientY)
    const next = {
      ...currentMarquee,
      currentX: world.x,
      currentY: world.y,
    }
    marqueeRef.current = next
    setMarquee(next)
  }

  const handleCanvasPointerUp = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    endPan(event)

    const currentMarquee = marqueeRef.current
    if (currentMarquee) {
      const x = Math.min(currentMarquee.startX, currentMarquee.currentX)
      const y = Math.min(currentMarquee.startY, currentMarquee.currentY)
      const width = Math.abs(currentMarquee.currentX - currentMarquee.startX)
      const height = Math.abs(currentMarquee.currentY - currentMarquee.startY)

      if (width > 8 || height > 8) {
        const selected = positionedNodes
          .filter((node) => nodeIntersectsRect(node, { x, y, width, height }))
          .map((node) => node.id)
        onSelectNodes(selected)
      } else if (connectionSource) {
        const lockedPoint = {
          x: currentMarquee.currentX,
          y: currentMarquee.currentY,
        }
        setConnectionPreview(lockedPoint)
        setConnectionPreviewLocked(true)
        onConnectionDraftCanvasClick?.(
          lockedPoint,
          connectionSource,
          { clientX: event.clientX, clientY: event.clientY }
        )
        onSelectNode(null)
      } else {
        onSelectNode(null)
      }

      marqueeRef.current = null
      setMarquee(null)
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const marqueeStyle = marquee
    ? {
        left:
          Math.min(marquee.startX, marquee.currentX) * viewport.zoom +
          viewport.x,
        top:
          Math.min(marquee.startY, marquee.currentY) * viewport.zoom +
          viewport.y,
        width:
          Math.abs(marquee.currentX - marquee.startX) * viewport.zoom,
        height:
          Math.abs(marquee.currentY - marquee.startY) * viewport.zoom,
      }
    : null

  return (
    <div
      className={cn(
        "relative min-h-0",
        fullBleed ? "h-full" : "flex flex-1 flex-col"
      )}
    >
      {!fullBleed ? (
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="min-w-0">
            <h2 className="text-sm font-medium">Canvas</h2>
            <p className="truncate text-xs text-muted-foreground">
              Drag output port to input port to connect · Scroll to zoom ·
              Shift+click multi-select
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground" />
              }
            >
              {isPanning ? (
                <>
                  <HandIcon />
                  Panning
                </>
              ) : (
                <>
                  <SelectionIcon />
                  Selecting
                </>
              )}
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isPanning
                ? "Drag to pan the canvas. Release Space to return to select mode."
                : "Drag nodes to move them. Drag empty space to marquee select. Hold Space, middle mouse, or use the Pan button to pan."}
            </TooltipContent>
          </Tooltip>
        </div>
      ) : null}

      <div className={cn("relative min-h-0", fullBleed ? "h-full" : "flex-1")}>
        <div
          ref={(node) => {
            containerRef.current = node
            setNodeRef(node)
          }}
          tabIndex={0}
          className={cn(
            "absolute inset-0 overflow-hidden bg-muted/20 outline-none",
            isOver && "bg-primary/5",
            isPanning && "cursor-grab active:cursor-grabbing"
          )}
          onWheel={handleWheel}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
        >
          <div
            className="absolute origin-top-left"
            style={{
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            }}
          >
            <div
              className="relative hairline-dots"
              style={{
                width: worldBounds.width,
                height: worldBounds.height,
              }}
            >
              {displayNodes.length === 0 ? (
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: worldBounds.width,
                    height: worldBounds.height,
                  }}
                >
                  <Empty className="max-w-md border border-dashed bg-background/90">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <PlusIcon />
                      </EmptyMedia>
                      <EmptyTitle>Build your workflow</EmptyTitle>
                      <EmptyDescription>
                        Open resources from the toolbar to drag components or
                        templates, or use AI Builder to generate a workflow.
                      </EmptyDescription>
                    </EmptyHeader>
                  </Empty>
                </div>
              ) : (
                <>
                  <svg
                    className="absolute inset-0"
                    width={worldBounds.width}
                    height={worldBounds.height}
                    aria-hidden={false}
                  >
                    {edges.map((edge) => {
                      const from = nodeById.get(edge.source)
                      const to = nodeById.get(edge.target)
                      if (!from || !to) {
                        return null
                      }

                      return (
                        <CanvasWorkflowEdge
                          key={edge.id}
                          edge={edge}
                          from={from}
                          to={to}
                          isSelected={selectedEdgeId === edge.id}
                          isActive={activeEdgeId === edge.id}
                          onSelect={handleEdgeSelect}
                        />
                      )
                    })}

                    {connectionSource && connectionPreview
                      ? (() => {
                          const from = nodeById.get(connectionSource.nodeId)
                          if (!from) {
                            return null
                          }

                          return (
                            <path
                              d={buildPreviewConnectionPath(
                                from,
                                connectionPreview,
                                connectionSource.side,
                                connectionSource.portId
                              )}
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              strokeDasharray="6 4"
                              className="pointer-events-none text-primary/70"
                            />
                          )
                        })()
                      : null}
                  </svg>

                  {displayNodes.map((node) => (
                    <CanvasWorkflowNode
                      key={node.id}
                      node={node}
                      zoom={viewport.zoom}
                      isSelected={selectedNodeIds.includes(node.id)}
                      executionState={nodeExecutionStates[node.id] ?? "idle"}
                      isConnectionSource={
                        connectionSource?.nodeId === node.id
                      }
                      connectionSourcePortId={
                        connectionSource?.nodeId === node.id
                          ? connectionSource.portId
                          : undefined
                      }
                      connectionSourceSide={
                        connectionSource?.nodeId === node.id
                          ? connectionSource.side
                          : undefined
                      }
                      isConnectionTarget={
                        connectionSource !== null &&
                        connectionSource.side === "output" &&
                        connectionSource.nodeId !== node.id
                      }
                      isOutputConnectionTarget={
                        connectionSource !== null &&
                        connectionSource.side === "input" &&
                        connectionSource.nodeId !== node.id
                      }
                      onPortPointerDown={(side, event, portIndex) =>
                        handlePortPointerDown(node.id, side, event, portIndex)
                      }
                      onSelect={(additive) => handleNodeSelect(node.id, additive)}
                      onMove={handleNodeMove}
                      onMoveEnd={handleNodeMoveEnd}
                    />
                  ))}
                </>
              )}
            </div>
          </div>

          {marqueeStyle ? (
            <div
              className="pointer-events-none absolute z-10 border border-primary bg-primary/10"
              style={marqueeStyle}
            />
          ) : null}
        </div>

        <CanvasToolbar
          mode={canvasMode}
          onModeChange={setCanvasMode}
          zoom={viewport.zoom}
          selectedCount={selectedNodeIds.length}
          hasEdgeSelected={selectedEdgeId !== null}
          canPaste={canPaste}
          canUndo={canUndo}
          canRedo={canRedo}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          onFitView={fitToContent}
          onUndo={onUndo}
          onRedo={onRedo}
          onCopy={onCopy}
          onPaste={onPaste}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      </div>
    </div>
  )
}
