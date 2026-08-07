import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Suspense } from "react"

import { DesignHubView } from "@/components/design/design-hub-view"
import { parseDesignPanelParam } from "@/lib/design/design-hub-types"
import { listDataTableSummaries } from "@/lib/data/data-tables"
import { listSecretSummaries } from "@/lib/data/secrets"
import { getWorkflowDraft } from "@/lib/data/workflows"
import { listTemplates } from "@/lib/data/templates"
import { isPersistedWorkflowId } from "@/lib/data/workflow-mappers"

export const metadata: Metadata = {
  title: "Workflow Editor",
}

export default async function WorkflowEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ panel?: string; id?: string }>
}) {
  const params = await searchParams
  const initialPanel = parseDesignPanelParam(params.panel)

  if (!params.id || !isPersistedWorkflowId(params.id)) {
    redirect("/design/workflows")
  }

  const [workflow, templates, dataTables, secrets] = await Promise.all([
    getWorkflowDraft(params.id),
    listTemplates(),
    listDataTableSummaries(),
    listSecretSummaries(),
  ])

  if (!isPersistedWorkflowId(workflow.id)) {
    redirect("/design/workflows")
  }

  return (
    <Suspense fallback={null}>
      <DesignHubView
        key={workflow.id}
        initialPanel={initialPanel}
        workflow={workflow}
        templates={templates}
        dataTables={dataTables}
        secrets={secrets}
      />
    </Suspense>
  )
}
