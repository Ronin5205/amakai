import { notFound, redirect } from "next/navigation"

import { LiveWorkflowOperateTabs } from "@/components/views/live-workflows-view"
import { StatusBadge } from "@/components/portal/status-badge"
import { formatDateTime } from "@/lib/format"
import { getLiveWorkflow } from "@/lib/data/deployments"

export default async function LiveWorkflowLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ workflowId: string }>
}) {
  const { workflowId } = await params
  const workflow = await getLiveWorkflow(workflowId)

  if (!workflow) {
    notFound()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          Operate
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            {workflow.name}
          </h1>
          <StatusBadge status="production" label="Live" />
        </div>
        <p className="text-sm text-muted-foreground">
          Deployed {formatDateTime(workflow.deployedAt)} · {workflow.nodeCount}{" "}
          nodes
          {workflow.triggerType ? ` · ${workflow.triggerType} trigger` : ""}
        </p>
      </div>

      <LiveWorkflowOperateTabs workflowId={workflow.id} />
      {children}
    </div>
  )
}
