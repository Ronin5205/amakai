"use client"

import * as React from "react"
import { useDraggable } from "@dnd-kit/core"
import { DotsSixVerticalIcon, MagnifyingGlassIcon } from "@phosphor-icons/react"

import {
  getComponentCatalogGroups,
  type ComponentCatalogItem,
} from "@/lib/design/component-catalog"
import { filterCatalogForConnectionDraft } from "@/lib/design/connection-placement"
import type { ConnectionDraft } from "@/lib/design/connection-draft"
import { paletteDragId } from "@/lib/design/node-utils"
import type { WorkflowNode } from "@/lib/domain/workflow"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@amakai/shared/components/ui/accordion"
import { Input } from "@amakai/shared/components/ui/input"
import { cn } from "@amakai/shared/lib/utils"

function DraggablePaletteItem({
  item,
  onSelect,
}: {
  item: ComponentCatalogItem
  onSelect?: (catalogItemId: string) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: paletteDragId(item.id),
    data: { catalogItemId: item.id, kind: item.kind },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-start gap-2 rounded-none border bg-background px-2 py-2 touch-none",
        isDragging && "opacity-50",
        onSelect && "cursor-pointer hover:border-primary hover:bg-accent/40"
      )}
      {...attributes}
      {...listeners}
      onClick={() => onSelect?.(item.id)}
      onKeyDown={(event) => {
        if (onSelect && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault()
          onSelect(item.id)
        }
      }}
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <DotsSixVerticalIcon className="mt-0.5 shrink-0 text-muted-foreground" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-xs font-medium">{item.label}</span>
        <span className="text-pretty text-[11px] leading-snug text-muted-foreground">
          {item.description}
        </span>
      </div>
    </div>
  )
}

export interface NodePalettePanelProps {
  connectionDraft?: ConnectionDraft | null
  anchorNode?: WorkflowNode | null
  onSelectComponent?: (catalogItemId: string) => void
}

export function NodePalettePanel({
  connectionDraft = null,
  anchorNode = null,
  onSelectComponent,
}: NodePalettePanelProps) {
  const [query, setQuery] = React.useState("")
  const groups = React.useMemo(() => getComponentCatalogGroups(query), [query])
  const [openCategories, setOpenCategories] = React.useState<string[]>([])

  const filteredGroups = React.useMemo(() => {
    if (!connectionDraft || !anchorNode) {
      return groups
    }

    const compatibleItems = filterCatalogForConnectionDraft(
      connectionDraft,
      anchorNode,
      query
    )
    const compatibleIds = new Set(compatibleItems.map((item) => item.id))

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => compatibleIds.has(item.id)),
      }))
      .filter((group) => group.items.length > 0)
  }, [anchorNode, connectionDraft, groups, query])

  React.useEffect(() => {
    if (query.trim()) {
      setOpenCategories(filteredGroups.map((group) => group.id))
      return
    }

    setOpenCategories([])
  }, [filteredGroups, query])

  const placementHint =
    connectionDraft?.side === "output"
      ? "Choose a component to connect after the selected node."
      : connectionDraft?.side === "input"
        ? "Choose a component to connect before the selected node."
        : null

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {placementHint ? (
        <div className="shrink-0 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {placementHint}
        </div>
      ) : null}

      <div className="shrink-0 border-b p-3">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search components..."
            className="pl-8"
            aria-label="Search components"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {filteredGroups.length > 0 ? (
          <Accordion
            value={openCategories}
            onValueChange={(value) =>
              setOpenCategories(Array.isArray(value) ? value : [value])
            }
            className="border-b border-border"
          >
            {filteredGroups.map((group) => (
              <AccordionItem key={group.id} value={group.id}>
                <AccordionTrigger className="items-center px-3 py-3 hover:no-underline">
                  <div className="flex min-w-0 flex-1 items-center gap-2 pe-1">
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                      <span className="text-xs font-medium">{group.label}</span>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        {group.description}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {group.items.length}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="flex flex-col gap-2">
                    {group.items.map((item) => (
                      <DraggablePaletteItem
                        key={item.id}
                        item={item}
                        onSelect={onSelectComponent}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <p className="p-4 text-center text-xs text-muted-foreground">
            {connectionDraft
              ? "No compatible components match your search."
              : "No components match your search."}
          </p>
        )}
      </div>
    </div>
  )
}
