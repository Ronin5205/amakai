import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { WorkflowExecutionsView } from "@/components/views/workflow-executions-view"
import { getExecutionDetailAction } from "@/lib/actions/operate-actions"
import { getLiveWorkflow } from "@/lib/data/deployments"
import {
  getWorkflowExecutionSummary,
  listWorkflowExecutions,
} from "@/lib/data/executions"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ workflowId: string }>
}): Promise<Metadata> {
  const { workflowId } = await params
  const workflow = await getLiveWorkflow(workflowId)

  return {
    title: workflow ? `${workflow.name} · Executions` : "Executions",
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ workflowId: string }>
}) {
  const { workflowId } = await params
  const workflow = await getLiveWorkflow(workflowId)

  if (!workflow) {
    notFound()
  }

  const [executions, summary] = await Promise.all([
    listWorkflowExecutions(workflowId),
    getWorkflowExecutionSummary(workflowId),
  ])

  return (
    <WorkflowExecutionsView
      executions={executions}
      summary={summary}
      getExecutionDetail={getExecutionDetailAction}
    />
  )
}
