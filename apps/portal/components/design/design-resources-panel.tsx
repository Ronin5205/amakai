"use client"

import { DesignResourcesContent } from "@/components/design/design-resources-content"
import type { ResourcesPanelTab } from "@/lib/design/design-hub-types"
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
}

export function DesignResourcesPanel({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
  templates,
  onApplyTemplate,
}: DesignResourcesPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showOverlay={false}
        className="w-full gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>Resources</SheetTitle>
          <SheetDescription>
            Drag components or templates onto the canvas.
          </SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <DesignResourcesContent
            activeTab={activeTab}
            onTabChange={onTabChange}
            templates={templates}
            onApplyTemplate={onApplyTemplate}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
