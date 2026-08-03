"use client"

import {
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  ClipboardTextIcon,
  CopyIcon,
  HandIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
  SelectionIcon,
  SquaresFourIcon,
  StackIcon,
  TrashIcon,
} from "@phosphor-icons/react"

import { Button } from "@amakai/shared/components/ui/button"
import { Separator } from "@amakai/shared/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@amakai/shared/components/ui/tooltip"

export type CanvasInteractionMode = "select" | "pan"

export interface CanvasToolbarProps {
  mode: CanvasInteractionMode
  onModeChange: (mode: CanvasInteractionMode) => void
  zoom: number
  selectedCount: number
  hasEdgeSelected: boolean
  canPaste: boolean
  canUndo: boolean
  canRedo: boolean
  onZoomIn: () => void
  onZoomOut: () => void
  onFitView: () => void
  onResetZoom: () => void
  onUndo: () => void
  onRedo: () => void
  onCopy: () => void
  onPaste: () => void
  onDuplicate: () => void
  onDelete: () => void
}

function stopCanvasPointerPropagation(
  event: React.SyntheticEvent<HTMLDivElement>
) {
  event.stopPropagation()
}

export function CanvasToolbar({
  mode,
  onModeChange,
  zoom,
  selectedCount,
  hasEdgeSelected,
  canPaste,
  canUndo,
  canRedo,
  onZoomIn,
  onZoomOut,
  onFitView,
  onResetZoom,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
}: CanvasToolbarProps) {
  const hasNodeSelection = selectedCount > 0
  const hasSelection = hasNodeSelection || hasEdgeSelected

  return (
    <div
      className="pointer-events-auto absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center gap-2"
      onPointerDown={stopCanvasPointerPropagation}
      onPointerUp={stopCanvasPointerPropagation}
      onClick={stopCanvasPointerPropagation}
    >
      <div className="flex items-center gap-0.5 rounded-none border bg-background/95 p-0.5 shadow-sm backdrop-blur-sm">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant={mode === "select" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5"
                onClick={() => onModeChange("select")}
              />
            }
          >
            <SelectionIcon />
            Select
          </TooltipTrigger>
          <TooltipContent side="top">
            Select and drag nodes. Shift+click for multi-select. Drag empty canvas
            to marquee select.
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant={mode === "pan" ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5"
                onClick={() => onModeChange("pan")}
              />
            }
          >
            <HandIcon />
            Pan
          </TooltipTrigger>
          <TooltipContent side="top">
            Click and drag to move around the canvas. You can also hold Space or
            use the middle mouse button while in select mode.
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="flex items-center gap-1 rounded-none border bg-background/95 px-2 py-1.5 shadow-sm backdrop-blur-sm">
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onZoomOut}
              />
            }
          >
            <MagnifyingGlassMinusIcon />
          </TooltipTrigger>
          <TooltipContent side="top">Zoom out</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                className="min-w-12 px-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={onResetZoom}
              />
            }
          >
            {Math.round(zoom * 100)}%
          </TooltipTrigger>
          <TooltipContent side="top">Reset zoom to 100%</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onZoomIn}
              />
            }
          >
            <MagnifyingGlassPlusIcon />
          </TooltipTrigger>
          <TooltipContent side="top">Zoom in</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onFitView}
              />
            }
          >
            <SquaresFourIcon />
          </TooltipTrigger>
          <TooltipContent side="top">Fit workflow to view</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!canUndo}
                onClick={onUndo}
              />
            }
          >
            <ArrowUUpLeftIcon />
          </TooltipTrigger>
          <TooltipContent side="top">Undo (Ctrl+Z)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!canRedo}
                onClick={onRedo}
              />
            }
          >
            <ArrowUUpRightIcon />
          </TooltipTrigger>
          <TooltipContent side="top">Redo (Ctrl+Shift+Z)</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-1 h-5" />

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!hasNodeSelection}
                onClick={onCopy}
              />
            }
          >
            <CopyIcon />
          </TooltipTrigger>
          <TooltipContent side="top">Copy (Ctrl+C)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!canPaste}
                onClick={onPaste}
              />
            }
          >
            <ClipboardTextIcon />
          </TooltipTrigger>
          <TooltipContent side="top">Paste (Ctrl+V)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!hasNodeSelection}
                onClick={onDuplicate}
              />
            }
          >
            <StackIcon />
          </TooltipTrigger>
          <TooltipContent side="top">Duplicate (Ctrl+D)</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={!hasSelection}
                onClick={onDelete}
              />
            }
          >
            <TrashIcon />
          </TooltipTrigger>
          <TooltipContent side="top">Delete selected</TooltipContent>
        </Tooltip>

        {hasSelection ? (
          <>
            <Separator orientation="vertical" className="mx-1 h-5" />
            <span className="px-1 text-xs text-muted-foreground">
              {hasEdgeSelected
                ? "1 connection"
                : `${selectedCount} selected`}
            </span>
          </>
        ) : null}
      </div>
    </div>
  )
}
