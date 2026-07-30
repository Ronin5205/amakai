import type { Metadata } from "next"

import { DashboardView } from "@/components/views/dashboard-view"
import { getAiUsage, getLiveWorkflowCounts, getPerformanceMetrics } from "@/lib/data/dashboard"
import { listExecutions } from "@/lib/data/executions"
import { listWorkflows } from "@/lib/data/workflows"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default async function DashboardPage() {
  const [workflows, workflowCounts, performanceMetrics, aiUsage, executions] =
    await Promise.all([
      listWorkflows(),
      getLiveWorkflowCounts(),
      getPerformanceMetrics(),
      getAiUsage(),
      listExecutions(),
    ])

  const recentExecutions = executions.slice(0, 5)

  return (
    <DashboardView
      hasWorkflows={workflows.length > 0}
      workflowCounts={workflowCounts}
      performanceMetrics={performanceMetrics}
      aiUsage={aiUsage}
      recentExecutions={recentExecutions}
    />
  )
}
