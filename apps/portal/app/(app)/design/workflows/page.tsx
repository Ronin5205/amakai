import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { WorkflowsView } from "@/components/design/workflows-view"
import { createWorkflowDraft, listWorkflows } from "@/lib/data/workflows"

export const metadata: Metadata = {
  title: "Workflows",
}

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>
}) {
  const params = await searchParams

  if (params.new === "1") {
    const created = await createWorkflowDraft()
    redirect(`/design/workflow-editor?id=${created.id}`)
  }

  const workflows = await listWorkflows()

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
      <WorkflowsView workflows={workflows} />
    </div>
  )
}
