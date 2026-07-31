"use client"

import { useDroppable } from "@dnd-kit/core"

import { DesignResourcesContent } from "@/components/design/design-resources-content"
import type { ConnectionDraft } from "@/lib/design/connection-draft"
import { RESOURCES_PANEL_DROP_ID } from "@/lib/design/design-hub-types"
import type { ResourcesPanelTab } from "@/lib/design/design-hub-types"
import type { WorkflowNode } from "@/lib/domain/workflow"
import type { WorkflowTemplate } from "@/lib/domain/template"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@amakai/shared/components/ui/sheet"

export type { ResourcesPanelTab }

export interface DesignResourcesPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeTab: ResourcesPanelTab
  onTabChange: (tab: ResourcesPanelTab) => void
  templates: WorkflowTemplate[]
  onApplyTemplate: (template: WorkflowTemplate) => void
  connectionDraft?: ConnectionDraft | null
  connectionAnchorNode?: WorkflowNode | null
  onSelectComponent?: (catalogItemId: string) => void
}

export function DesignResourcesPanel({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
  templates,
  onApplyTemplate,
  connectionDraft = null,
  connectionAnchorNode = null,
  onSelectComponent,
}: DesignResourcesPanelProps) {
  const { setNodeRef } = useDroppable({
    id: RESOURCES_PANEL_DROP_ID,
    disabled: !open,
  })

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showOverlay={false}
        className="w-full gap-0 p-0 sm:max-w-md"
      >
        <div ref={setNodeRef} className="flex h-full min-h-0 flex-col">
          <SheetHeader className="border-b px-4 py-4">
            <SheetTitle>Resources</SheetTitle>
            <SheetDescription>
              {connectionDraft
                ? "Select a compatible component to place and connect on the canvas."
                : "Drag components or templates onto the canvas."}
            </SheetDescription>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <DesignResourcesContent
              activeTab={activeTab}
              onTabChange={onTabChange}
              templates={templates}
              onApplyTemplate={onApplyTemplate}
              connectionDraft={connectionDraft}
              connectionAnchorNode={connectionAnchorNode}
              onSelectComponent={onSelectComponent}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
