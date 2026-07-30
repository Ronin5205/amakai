import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"
import { ExecutionsView } from "@/components/views/executions-view"
import { getExecutionSummary, listExecutions } from "@/lib/data/executions"

export const metadata: Metadata = {
  title: "Executions",
}

export default async function Page() {
  const [executions, summary] = await Promise.all([
    listExecutions(),
    getExecutionSummary(),
  ])

  return (
    <SectionPage
      eyebrow="Operate"
      title="Executions"
      description="Monitor live and recent workflow runs, filter by status, and inspect execution details."
    >
      <ExecutionsView executions={executions} summary={summary} />
    </SectionPage>
  )
}
