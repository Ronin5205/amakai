import type { Metadata } from "next"

import { DashboardView } from "@/components/views/dashboard-view"
import { getAiUsage, getLiveWorkflowCounts, getPerformanceMetrics } from "@/lib/data/dashboard"
import { listExecutions } from "@/lib/data/executions"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  const [workflowCounts, performanceMetrics, aiUsage, executions] =
    await Promise.all([
      getLiveWorkflowCounts(),
      getPerformanceMetrics(),
      getAiUsage(),
      listExecutions(),
    ])

  const recentExecutions = executions.slice(0, 5)

  return (
    <DashboardView
      workflowCounts={workflowCounts}
      performanceMetrics={performanceMetrics}
      aiUsage={aiUsage}
      recentExecutions={recentExecutions}
    />
  )
}
