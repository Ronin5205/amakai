import type { Metadata } from "next"

import { ProductionRunsView } from "@/components/views/production-runs-view"
import { SectionPage } from "@/components/section-page"
import { getLiveWorkflow, listLiveWorkflows } from "@/lib/data/deployments"

export const metadata: Metadata = {
  title: "Production Runs",
}

export default async function ProductionRunsPage() {
  const liveWorkflows = await listLiveWorkflows()
  const workflowDetails = (
    await Promise.all(liveWorkflows.map((workflow) => getLiveWorkflow(workflow.id)))
  ).filter((workflow): workflow is NonNullable<typeof workflow> => workflow !== null)

  return (
    <SectionPage
      eyebrow="Production"
      title="Runs"
      description="Execute deployed workflows in production. Each run is recorded in history and linked from Operate."
    >
      <ProductionRunsView
        liveWorkflows={liveWorkflows}
        workflowDetails={workflowDetails}
      />
    </SectionPage>
  )
}
