import type { Metadata } from "next"

import { ProductionHistoryView } from "@/components/views/production-history-view"
import { SectionPage } from "@/components/section-page"
import {
  getProductionRunSummary,
  listProductionRuns,
} from "@/lib/data/production-runs"

export const metadata: Metadata = {
  title: "Production History",
}

export default async function ProductionHistoryPage() {
  const [runs, summary] = await Promise.all([
    listProductionRuns(),
    getProductionRunSummary(),
  ])

  return (
    <SectionPage
      eyebrow="Production"
      title="History"
      description="All production runs across your deployed workflows."
    >
      <ProductionHistoryView runs={runs} summary={summary} />
    </SectionPage>
  )
}
