"use client"

import { NodePalettePanel } from "@/components/design/node-palette-panel"
import { TemplatesPanel } from "@/components/design/templates-panel"
import type { WorkflowTemplate } from "@/lib/domain/template"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@amakai/shared/components/ui/tabs"
import { PuzzlePieceIcon, StackIcon } from "@phosphor-icons/react"

import type { ResourcesPanelTab } from "@/lib/design/design-hub-types"

export interface DesignResourcesContentProps {
  activeTab: ResourcesPanelTab
  onTabChange: (tab: ResourcesPanelTab) => void
  templates: WorkflowTemplate[]
  onApplyTemplate: (template: WorkflowTemplate) => void
}

export function DesignResourcesContent({
  activeTab,
  onTabChange,
  templates,
  onApplyTemplate,
}: DesignResourcesContentProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as ResourcesPanelTab)}
      className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden"
    >
      <TabsList
        variant="line"
        className="grid h-10 w-full shrink-0 grid-cols-2 rounded-none border-b p-0"
      >
        <TabsTrigger
          value="components"
          title="Components"
          className="h-full min-w-0 rounded-none"
        >
          <PuzzlePieceIcon />
          <span className="sr-only">Components</span>
        </TabsTrigger>
        <TabsTrigger
          value="templates"
          title="Templates"
          className="h-full min-w-0 rounded-none"
        >
          <StackIcon />
          <span className="sr-only">Templates</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent
        value="components"
        className="min-h-0 flex-1 overflow-hidden"
      >
        <NodePalettePanel />
      </TabsContent>
      <TabsContent value="templates" className="min-h-0 flex-1 overflow-hidden">
        <TemplatesPanel templates={templates} onApply={onApplyTemplate} />
      </TabsContent>
    </Tabs>
  )
}
