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
  getNodeDimensions,
  getPortYOffset,
} from "@/lib/design/node-layout"
import { resolveNodeDefinition } from "@/lib/design/resolve-node-definition"
import type { NodeKind, NodePort, WorkflowNode } from "@/lib/domain/workflow"
import type { NodeExecutionState } from "@/lib/engine/types"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@amakai/shared/components/ui/tooltip"
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

function PortTooltip({
  port,
  nodeLabel,
  side,
  children,
}: {
  port: NodePort
  nodeLabel: string
  side: "left" | "right"
  children: React.ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side} className="max-w-56 text-left">
        <p className="font-medium">{port.label}</p>
        {port.description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{port.description}</p>
        ) : (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {side === "left"
              ? `Connect data into ${nodeLabel}.`
              : `Connect data from ${nodeLabel}.`}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

export interface CanvasWorkflowNodeProps {
  node: WorkflowNode
  isSelected: boolean
  executionState?: NodeExecutionState
  isConnectionSource: boolean
  connectionSourcePortId?: string
  isConnectionTarget: boolean
  zoom: number
  onSelect: (additive: boolean) => void
  onMove: (nodeId: string, deltaX: number, deltaY: number) => void
  onMoveEnd: () => void
  onPortPointerDown: (
    side: "input" | "output",
    event: React.PointerEvent<HTMLButtonElement>,
    portIndex?: number
  ) => void
}

export function CanvasWorkflowNode({
  node,
  isSelected,
  executionState = "idle",
  isConnectionSource,
  connectionSourcePortId,
  isConnectionTarget,
  zoom,
  onSelect,
  onMove,
  onMoveEnd,
  onPortPointerDown,
}: CanvasWorkflowNodeProps) {
  const Icon = NODE_ICONS[node.kind]
  const definition = resolveNodeDefinition(node)
  const inputPorts = definition.inputs
  const outputPorts = definition.outputs
  const { width, height } = getNodeDimensions(node)
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
        width,
        height,
        transform: `translate(${x}px, ${y}px)`,
      }}
    >
      {inputPorts.map((port, index) => (
        <PortTooltip
          key={port.id}
          port={port}
          nodeLabel={node.label}
          side="left"
        >
          <button
            type="button"
            aria-label={`Connect ${port.label} to ${node.label}`}
            className={cn(
              "absolute -left-2 z-10 size-4 -translate-y-1/2 rounded-full border-2 bg-background transition-colors",
              isConnectionTarget
                ? "border-primary bg-primary/20"
                : "border-muted-foreground/40 hover:border-primary"
            )}
            style={{ top: getPortYOffset(index, inputPorts.length, height) }}
            onPointerDown={(event) => onPortPointerDown("input", event, index)}
          />
        </PortTooltip>
      ))}

      {outputPorts.map((port, index) => {
        const isPortConnectionSource =
          isConnectionSource && connectionSourcePortId === port.id

        return (
          <PortTooltip
            key={port.id}
            port={port}
            nodeLabel={node.label}
            side="right"
          >
            <button
              type="button"
              aria-label={`Connect ${port.label} from ${node.label}`}
              className={cn(
                "absolute -right-2 z-10 size-4 -translate-y-1/2 rounded-full border-2 bg-background transition-colors",
                isPortConnectionSource
                  ? "border-primary bg-primary/20"
                  : "border-primary/50 hover:border-primary"
              )}
              style={{ top: getPortYOffset(index, outputPorts.length, height) }}
              onPointerDown={(event) => onPortPointerDown("output", event, index)}
            />
          </PortTooltip>
        )
      })}

      <div
        className={cn(
          "relative flex h-full cursor-grab items-center gap-3 overflow-hidden rounded-none border bg-background px-3 shadow-sm active:cursor-grabbing",
          isSelected && "border-primary ring-2 ring-primary/20",
          isConnectionSource &&
            connectionSourcePortId &&
            "border-primary/60"
        )}
        onPointerDown={handleBodyPointerDown}
      >
        {executionState !== "idle" ? (
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-0 transition-[background-color,box-shadow] duration-300",
              executionState === "running" &&
                "bg-chart-2/20 ring-2 ring-inset ring-chart-2/70",
              executionState === "completed" &&
                "bg-chart-3/12 ring-1 ring-inset ring-chart-3/50",
              executionState === "error" &&
                "bg-destructive/15 ring-2 ring-inset ring-destructive/80"
            )}
          />
        ) : null}

        <div className="relative z-[1] flex size-9 shrink-0 items-center justify-center rounded-none bg-muted">
          <Icon className="text-foreground" />
        </div>

        <div className="relative z-[1] flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-medium">{node.label}</span>
          <StatusBadge status={node.kind} label={node.kind} className="w-fit" />
        </div>
      </div>
    </div>
  )
}
