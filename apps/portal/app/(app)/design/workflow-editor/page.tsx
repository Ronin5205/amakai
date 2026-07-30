import type { Metadata } from "next"

import { WorkflowEditorView } from "@/components/views/workflow-editor-view"
import { getValidationChecks, getValidationStages } from "@/lib/data/validation"
import { getWorkflowDraft } from "@/lib/data/workflows"

export const metadata: Metadata = {
  title: "Workflow Editor",
}

export default async function WorkflowEditorPage() {
  const [workflow, validationStages, validationChecks] = await Promise.all([
    getWorkflowDraft(),
    getValidationStages(),
    getValidationChecks(),
  ])

  return (
    <WorkflowEditorView
      workflow={workflow}
      validationStages={validationStages}
      validationChecks={validationChecks}
    />
  )
}
