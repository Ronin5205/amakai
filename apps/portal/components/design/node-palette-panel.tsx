"use client"

import * as React from "react"
import { useDraggable } from "@dnd-kit/core"
import { DotsSixVerticalIcon, MagnifyingGlassIcon } from "@phosphor-icons/react"

import {
  getComponentCatalogGroups,
  type ComponentCatalogItem,
} from "@/lib/design/component-catalog"
import { paletteDragId } from "@/lib/design/node-utils"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@amakai/shared/components/ui/accordion"
import { Input } from "@amakai/shared/components/ui/input"
import { cn } from "@amakai/shared/lib/utils"

function DraggablePaletteItem({ item }: { item: ComponentCatalogItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: paletteDragId(item.kind),
    data: { kind: item.kind },
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex items-start gap-2 rounded-none border bg-background px-2 py-2 touch-none",
        isDragging && "opacity-50"
      )}
      {...attributes}
      {...listeners}
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

export function NodePalettePanel() {
  const [query, setQuery] = React.useState("")
  const groups = React.useMemo(() => getComponentCatalogGroups(query), [query])
  const [openCategories, setOpenCategories] = React.useState<string[]>(["core"])

  React.useEffect(() => {
    if (query.trim()) {
      setOpenCategories(groups.map((group) => group.id))
      return
    }

    setOpenCategories(["core"])
  }, [groups, query])

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
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
        {groups.length > 0 ? (
          <Accordion
            value={openCategories}
            onValueChange={(value) =>
              setOpenCategories(Array.isArray(value) ? value : [value])
            }
            className="border-b border-border"
          >
            {groups.map((group) => (
              <AccordionItem key={group.id} value={group.id}>
                <AccordionTrigger className="px-3 py-3 hover:no-underline">
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pe-2">
                    <div className="flex min-w-0 flex-col items-start gap-0.5">
                      <span className="text-xs font-medium">{group.label}</span>
                      <span className="text-[11px] font-normal text-muted-foreground">
                        {group.description}
                      </span>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {group.items.length}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="flex flex-col gap-2">
                    {group.items.map((item) => (
                      <DraggablePaletteItem key={item.kind} item={item} />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <p className="p-4 text-center text-xs text-muted-foreground">
            No components match your search.
          </p>
        )}
      </div>
    </div>
  )
}
