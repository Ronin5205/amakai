import type { Metadata } from "next"

import { DashboardView } from "@/components/views/dashboard-view"
import { listLiveWorkflows } from "@/lib/data/deployments"
import {
  getProductionRunSummary,
  listProductionRuns,
} from "@/lib/data/production-runs"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  const [liveWorkflows, recentProductionRuns, productionRunSummary] =
    await Promise.all([
      listLiveWorkflows(),
      listProductionRuns(5),
      getProductionRunSummary(),
    ])

  return (
    <DashboardView
      liveWorkflows={liveWorkflows}
      recentProductionRuns={recentProductionRuns}
      productionRunSummary={productionRunSummary}
    />
  )
}
