import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { WorkflowsView } from "@/components/design/workflows-view"
import {
  createWorkflowDraft,
  getWorkflowLimitState,
  listWorkflows,
} from "@/lib/data/workflows"
import { workflowLimitReachedMessage } from "@/lib/data/workflow-limits"

export const metadata: Metadata = {
  title: "Workflows",
}

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const params = await searchParams
  const workflowLimit = await getWorkflowLimitState()

  if (params.new === "1") {
    if (workflowLimit?.canCreate ?? true) {
      const created = await createWorkflowDraft()
      redirect(`/design/workflow-editor?id=${created.id}`)
    }
  }

  const workflows = await listWorkflows()
  const limitError =
    params.new === "1" && workflowLimit && !workflowLimit.canCreate
      ? workflowLimitReachedMessage(workflowLimit.limit)
      : null

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
      <WorkflowsView
        workflows={workflows}
        workflowLimit={workflowLimit}
        limitError={limitError}
      />
    </div>
  )
}
