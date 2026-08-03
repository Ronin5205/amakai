import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"
import { LiveWorkflowsView } from "@/components/views/live-workflows-view"
import { listLiveWorkflows } from "@/lib/data/deployments"

export const metadata: Metadata = {
  title: "Live Workflows",
}

export default async function Page() {
  const liveWorkflows = await listLiveWorkflows()

  return (
    <SectionPage
      eyebrow="Operate"
      title="Live Workflows"
      description="Production workflows with per-workflow monitoring and execution history."
    >
      <LiveWorkflowsView workflows={liveWorkflows} />
    </SectionPage>
  )
}
