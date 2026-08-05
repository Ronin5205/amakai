"use client"

import * as React from "react"
import { useDraggable } from "@dnd-kit/core"
import {
  DotsSixVerticalIcon,
  MagnifyingGlassIcon,
  UsersIcon,
} from "@phosphor-icons/react"

import { getNodeDimensions } from "@/lib/design/node-layout"
import { templateDragId } from "@/lib/design/node-utils"
import { normalizeTriggerMode } from "@/lib/design/trigger-config"
import type { WorkflowTemplate } from "@/lib/domain/template"
import type { NodeKind } from "@/lib/domain/workflow"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@amakai/shared/components/ui/accordion"
import { Badge } from "@amakai/shared/components/ui/badge"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@amakai/shared/components/ui/empty"
import { Input } from "@amakai/shared/components/ui/input"
import { cn } from "@amakai/shared/lib/utils"

const PREVIEW_WIDTH = 240
const PREVIEW_HEIGHT = 84
const PREVIEW_PADDING = 8
const PREVIEW_MIN_NODE_SIZE = 3

const BRANCHING_KINDS: NodeKind[] = ["conditional", "parallel"]

const TRIGGER_MODE_LABELS: Record<string, string> = {
  manual: "Manual",
  schedule: "Schedule",
  webhook: "Webhook",
  signal: "Signal",
  integration: "External tool",
}

type PreviewBox = {
  id: string
  kind: NodeKind
  x: number
  y: number
  width: number
  height: number
}

type PreviewGeometry = {
  boxes: PreviewBox[]
  lines: { id: string; x1: number; y1: number; x2: number; y2: number }[]
}

/** Scale the authored node grid down into a fixed-size thumbnail. */
function buildPreviewGeometry(template: WorkflowTemplate): PreviewGeometry {
  const raw = template.nodes.map((node) => {
    const { width, height } = getNodeDimensions(node)
    return {
      id: node.id,
      kind: node.kind,
      x: node.position?.x ?? 0,
      y: node.position?.y ?? 0,
      width,
      height,
    }
  })

  if (raw.length === 0) {
    return { boxes: [], lines: [] }
  }

  const minX = Math.min(...raw.map((box) => box.x))
  const minY = Math.min(...raw.map((box) => box.y))
  const maxX = Math.max(...raw.map((box) => box.x + box.width))
  const maxY = Math.max(...raw.map((box) => box.y + box.height))

  const innerWidth = PREVIEW_WIDTH - PREVIEW_PADDING * 2
  const innerHeight = PREVIEW_HEIGHT - PREVIEW_PADDING * 2
  const graphWidth = Math.max(1, maxX - minX)
  const graphHeight = Math.max(1, maxY - minY)
  const scale = Math.min(innerWidth / graphWidth, innerHeight / graphHeight)

  const offsetX = PREVIEW_PADDING + (innerWidth - graphWidth * scale) / 2
  const offsetY = PREVIEW_PADDING + (innerHeight - graphHeight * scale) / 2

  const boxes = raw.map((box) => ({
    id: box.id,
    kind: box.kind,
    x: offsetX + (box.x - minX) * scale,
    y: offsetY + (box.y - minY) * scale,
    width: Math.max(PREVIEW_MIN_NODE_SIZE, box.width * scale),
    height: Math.max(PREVIEW_MIN_NODE_SIZE, box.height * scale),
  }))

  const boxById = new Map(boxes.map((box) => [box.id, box]))
  const lines = template.edges.flatMap((edge) => {
    const from = boxById.get(edge.source)
    const to = boxById.get(edge.target)
    if (!from || !to) {
      return []
    }

    return [
      {
        id: edge.id,
        x1: from.x + from.width,
        y1: from.y + from.height / 2,
        x2: to.x,
        y2: to.y + to.height / 2,
      },
    ]
  })

  return { boxes, lines }
}

function TemplatePreview({ template }: { template: WorkflowTemplate }) {
  const { boxes, lines } = React.useMemo(
    () => buildPreviewGeometry(template),
    [template]
  )

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${PREVIEW_WIDTH} ${PREVIEW_HEIGHT}`}
      className="h-16 w-full bg-muted/40"
      preserveAspectRatio="xMidYMid meet"
    >
      {lines.map((line) => (
        <line
          key={line.id}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          className="stroke-muted-foreground/40"
          strokeWidth={1}
        />
      ))}
      {boxes.map((box) => (
        <rect
          key={box.id}
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
          className={cn(
            box.kind === "trigger"
              ? "fill-primary/70"
              : box.kind === "exception"
                ? "fill-destructive/60"
                : BRANCHING_KINDS.includes(box.kind)
                  ? "fill-foreground/45"
                  : "fill-foreground/25"
          )}
        />
      ))}
    </svg>
  )
}

function describeTemplate(template: WorkflowTemplate) {
  const triggerNode = template.nodes.find((node) => node.kind === "trigger")
  const triggerMode = triggerNode ? normalizeTriggerMode(triggerNode) : null
  const branchCount = template.nodes.filter((node) =>
    BRANCHING_KINDS.includes(node.kind)
  ).length

  return {
    triggerLabel: triggerMode
      ? (TRIGGER_MODE_LABELS[triggerMode] ?? triggerMode)
      : null,
    branchCount,
  }
}

function matchesQuery(template: WorkflowTemplate, query: string) {
  const needle = query.trim().toLowerCase()
  if (!needle) {
    return true
  }

  return [
    template.name,
    template.description,
    template.category,
    ...template.tags,
  ].some((value) => value.toLowerCase().includes(needle))
}

function DraggableTemplateCard({
  template,
  onApply,
}: {
  template: WorkflowTemplate
  onApply: (template: WorkflowTemplate) => void
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: templateDragId(template.id),
    data: { templateId: template.id },
  })
  const { triggerLabel, branchCount } = describeTemplate(template)

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-none border bg-background transition-colors hover:border-primary/60",
        isDragging && "opacity-50"
      )}
    >
      <div
        ref={setNodeRef}
        className="cursor-grab touch-none active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <TemplatePreview template={template} />
        <div className="flex items-start gap-2 border-t px-2.5 pt-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h4 className="truncate text-xs font-medium">{template.name}</h4>
            <p className="text-pretty text-[11px] leading-snug text-muted-foreground">
              {template.description}
            </p>
          </div>
          <DotsSixVerticalIcon className="mt-0.5 shrink-0 text-muted-foreground" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 px-2.5 pt-2">
        {triggerLabel ? <Badge variant="secondary">{triggerLabel}</Badge> : null}
        <Badge variant="outline">{template.nodeCount} steps</Badge>
        {branchCount > 0 ? (
          <Badge variant="outline">
            {branchCount} {branchCount === 1 ? "split" : "splits"}
          </Badge>
        ) : null}
      </div>

      <div className="p-2.5">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onApply(template)}
        >
          Use template
        </Button>
      </div>
    </div>
  )
}

export interface TemplatesPanelProps {
  templates: WorkflowTemplate[]
  onApply: (template: WorkflowTemplate) => void
}

export function TemplatesPanel({ templates, onApply }: TemplatesPanelProps) {
  const [query, setQuery] = React.useState("")
  const [openCategories, setOpenCategories] = React.useState<string[]>([])

  const groups = React.useMemo(() => {
    const byCategory = new Map<string, WorkflowTemplate[]>()

    for (const template of templates) {
      if (!matchesQuery(template, query)) {
        continue
      }

      const bucket = byCategory.get(template.category)
      if (bucket) {
        bucket.push(template)
      } else {
        byCategory.set(template.category, [template])
      }
    }

    return [...byCategory.entries()].map(([category, items]) => ({
      id: category,
      label: category,
      items,
    }))
  }, [query, templates])

  React.useEffect(() => {
    if (query.trim()) {
      setOpenCategories(groups.map((group) => group.id))
      return
    }

    setOpenCategories([])
  }, [groups, query])

  if (templates.length === 0) {
    return (
      <div className="flex h-full items-center p-3">
        <Empty className="border">
          <EmptyHeader>
            <EmptyTitle>No templates available</EmptyTitle>
            <EmptyDescription>
              Community and provider templates will appear here when published.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <UsersIcon className="size-4 text-muted-foreground" />
          </EmptyContent>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 border-b p-3">
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search templates..."
            className="pl-8"
            aria-label="Search templates"
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Drag a template onto the canvas to drop it where you point, or click
          Use template to center it.
        </p>
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
                    <span className="text-xs font-medium">{group.label}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {group.items.length}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-3 pb-3">
                  <div className="flex flex-col gap-2">
                    {group.items.map((template) => (
                      <DraggableTemplateCard
                        key={template.id}
                        template={template}
                        onApply={onApply}
                      />
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <p className="p-4 text-center text-xs text-muted-foreground">
            No templates match your search.
          </p>
        )}
      </div>
    </div>
  )
}
