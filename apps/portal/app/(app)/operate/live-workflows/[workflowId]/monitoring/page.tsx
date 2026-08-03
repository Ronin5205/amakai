import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { WorkflowMonitoringView } from "@/components/views/workflow-monitoring-view"
import { getLiveWorkflow } from "@/lib/data/deployments"
import { getWorkflowMonitoring } from "@/lib/data/monitoring"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workflowId: string }>
}): Promise<Metadata> {
  const { workflowId } = await params
  const workflow = await getLiveWorkflow(workflowId)

  return {
    title: workflow ? `${workflow.name} · Monitoring` : "Monitoring",
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ workflowId: string }>
}) {
  const { workflowId } = await params
  const snapshot = await getWorkflowMonitoring(workflowId)

  if (!snapshot) {
    notFound()
  }

  return <WorkflowMonitoringView snapshot={snapshot} />
}
