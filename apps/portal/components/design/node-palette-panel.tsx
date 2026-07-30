"use client"

import { useDraggable } from "@dnd-kit/core"
import { DotsSixVerticalIcon } from "@phosphor-icons/react"

import { NODE_PALETTE, paletteDragId } from "@/lib/design/node-utils"
import { StatusBadge } from "@/components/portal/status-badge"
import { ScrollArea } from "@amakai/shared/components/ui/scroll-area"
import { cn } from "@amakai/shared/lib/utils"

function DraggablePaletteItem({
  kind,
  label,
}: (typeof NODE_PALETTE)[number]) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: paletteDragId(kind),
    data: { kind },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-2 rounded-none border bg-background px-2 py-2 touch-none",
        isDragging && "opacity-50"
      )}
      {...attributes}
      {...listeners}
    >
      <DotsSixVerticalIcon className="shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-xs font-medium">{label}</span>
        <StatusBadge status={kind} label={kind} className="w-fit" />
      </div>
    </div>
  )
}

export function NodePalettePanel() {
  return (
    <ScrollArea className="h-full min-h-0">
      <div className="flex flex-col gap-2 p-3">
        <p className="text-xs text-muted-foreground">
          Drag onto the canvas to add steps.
        </p>
        {NODE_PALETTE.map((item) => (
          <DraggablePaletteItem key={item.kind} {...item} />
        ))}
      </div>
    </ScrollArea>
  )
}
