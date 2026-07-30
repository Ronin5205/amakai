"use client"

import { useDraggable } from "@dnd-kit/core"
import { DotsSixVerticalIcon, UsersIcon } from "@phosphor-icons/react"

import { templateDragId } from "@/lib/design/node-utils"
import type { WorkflowTemplate } from "@/lib/domain/template"
import { Badge } from "@amakai/shared/components/ui/badge"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@amakai/shared/components/ui/empty"
import { ScrollArea } from "@amakai/shared/components/ui/scroll-area"
import { cn } from "@amakai/shared/lib/utils"

export interface TemplatesPanelProps {
  templates: WorkflowTemplate[]
  onApply: (template: WorkflowTemplate) => void
}

function sourceLabel(source: WorkflowTemplate["source"]) {
  return source === "community" ? "Community" : "Provider"
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

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col gap-2 rounded-none border bg-background p-2.5 touch-none",
        isDragging && "opacity-50"
      )}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h4 className="truncate text-xs font-medium">{template.name}</h4>
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {template.description}
          </p>
        </div>
        <DotsSixVerticalIcon className="shrink-0 text-muted-foreground" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="outline">{template.category}</Badge>
        <Badge variant="secondary">{sourceLabel(template.source)}</Badge>
        <span className="text-xs text-muted-foreground">
          {template.nodeCount} nodes
        </span>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onApply(template)}
      >
        Use template
      </Button>
    </div>
  )
}

export function TemplatesPanel({ templates, onApply }: TemplatesPanelProps) {
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
    <ScrollArea className="h-full min-h-0">
      <div className="flex flex-col gap-2 p-3">
        <p className="text-xs text-muted-foreground">
          Drag onto the canvas or click Use template.
        </p>
        {templates.map((template) => (
          <DraggableTemplateCard
            key={template.id}
            template={template}
            onApply={onApply}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
