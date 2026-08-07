"use client"

import * as React from "react"

import type { Workflow, WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import type { WorkflowGraphDraft } from "@/lib/design/workflow-graph"

export type WorkflowEditorContextValue = {
  workflowId: string | null
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeId: string | null
  viewportAnchor: { x: number; y: number } | null
  applyGraph: ((graph: WorkflowGraphDraft) => void) | null
  isActive: boolean
}

const emptyContext: WorkflowEditorContextValue = {
  workflowId: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  viewportAnchor: null,
  applyGraph: null,
  isActive: false,
}

const WorkflowEditorContext =
  React.createContext<WorkflowEditorContextValue>(emptyContext)

const WorkflowEditorSetContext = React.createContext<
  React.Dispatch<React.SetStateAction<WorkflowEditorContextValue>> | null
>(null)

export function WorkflowEditorProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [value, setValue] =
    React.useState<WorkflowEditorContextValue>(emptyContext)

  return (
    <WorkflowEditorSetContext.Provider value={setValue}>
      <WorkflowEditorContext.Provider value={value}>
        {children}
      </WorkflowEditorContext.Provider>
    </WorkflowEditorSetContext.Provider>
  )
}

export function useWorkflowEditorContext() {
  return React.useContext(WorkflowEditorContext)
}

export function useRegisterWorkflowEditor(input: {
  workflow: Workflow
  selectedNodeId: string | null
  applyGraph: (graph: WorkflowGraphDraft) => void
}) {
  const setValue = React.useContext(WorkflowEditorSetContext)

  React.useEffect(() => {
    if (!setValue) return

    setValue({
      workflowId: input.workflow.id,
      nodes: input.workflow.nodes,
      edges: input.workflow.edges ?? [],
      selectedNodeId: input.selectedNodeId,
      viewportAnchor: null,
      applyGraph: input.applyGraph,
      isActive: true,
    })

    return () => {
      setValue(emptyContext)
    }
  }, [
    setValue,
    input.workflow.id,
    input.workflow.nodes,
    input.workflow.edges,
    input.selectedNodeId,
    input.applyGraph,
  ])
}
