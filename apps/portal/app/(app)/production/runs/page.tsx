import type { Metadata } from "next"

import { ProductionRunsView } from "@/components/views/production-runs-view"
import { SectionPage } from "@/components/section-page"
import { isManualLiveWorkflow } from "@/lib/domain/deployment"
import { getLiveWorkflow, listLiveWorkflows } from "@/lib/data/deployments"

export const metadata: Metadata = {
  title: "Production Runs",
}

export default async function ProductionRunsPage() {
  const liveWorkflows = await listLiveWorkflows()
  const manualWorkflows = liveWorkflows.filter(isManualLiveWorkflow)
  const workflowDetails = (
    await Promise.all(
      manualWorkflows.map((workflow) => getLiveWorkflow(workflow.id))
    )
  ).filter((workflow): workflow is NonNullable<typeof workflow> => workflow !== null)

  return (
    <SectionPage
      eyebrow="Production"
      title="Runs"
      description="Start manual workflows in production. Automated workflows run via their configured trigger."
    >
      <ProductionRunsView
        manualWorkflows={manualWorkflows}
        workflowDetails={workflowDetails}
      />
    </SectionPage>
  )
}
