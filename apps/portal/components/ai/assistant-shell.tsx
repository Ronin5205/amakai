"use client"

import { AssistantPanel } from "@/components/ai/assistant-panel"
import { AssistantProvider } from "@/components/ai/assistant-provider"
import { WorkflowEditorProvider } from "@/components/ai/workflow-editor-context"

export function AssistantShell({ children }: { children: React.ReactNode }) {
  return (
    <WorkflowEditorProvider>
      <AssistantProvider>
        {children}
        <AssistantPanel />
      </AssistantProvider>
    </WorkflowEditorProvider>
  )
}
