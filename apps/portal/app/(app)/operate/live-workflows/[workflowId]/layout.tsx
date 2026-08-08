import { notFound } from "next/navigation"

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

  const needsSetup =
    workflow.subscriptionStatus === "pending_setup" ||
    Boolean(workflow.setupRequired)

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
          {needsSetup ? (
            <StatusBadge status="warning" label="Setup needed" />
          ) : (
            <StatusBadge status="production" label="Live" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Deployed {formatDateTime(workflow.deployedAt)} · {workflow.nodeCount}{" "}
          nodes
          {workflow.triggerType ? ` · ${workflow.triggerType} trigger` : ""}
          {workflow.subscriptionStatus
            ? ` · subscription ${workflow.subscriptionStatus}`
            : ""}
        </p>
        {workflow.webhookUrl ? (
          <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Webhook URL
            </p>
            <code className="mt-1 block break-all text-xs">
              {workflow.webhookUrl}
            </code>
          </div>
        ) : null}
        {needsSetup || workflow.subscriptionWarning ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Trigger setup
            </p>
            <p className="mt-1 text-sm text-foreground">
              {workflow.subscriptionWarning ??
                "This trigger is not fully registered. Check env vars and redeploy."}
            </p>
            {workflow.setupRequired === "GMAIL_PUBSUB_TOPIC" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Set <code>GMAIL_PUBSUB_TOPIC</code>, create a Pub/Sub push to{" "}
                <code>/api/integrations/gmail/push</code>, and use a public
                tunnel when developing on localhost.
              </p>
            ) : null}
            {workflow.setupRequired === "NEXT_PUBLIC_PORTAL_URL" ||
            workflow.setupRequired === "outlook_subscription" ? (
              <p className="mt-2 text-xs text-muted-foreground">
                Set <code>NEXT_PUBLIC_PORTAL_URL</code> to a public HTTPS URL
                (ngrok / Cloudflare Tunnel) so Microsoft Graph can reach{" "}
                <code>/api/integrations/outlook/webhook</code>, then redeploy.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <LiveWorkflowOperateTabs workflowId={workflow.id} />
      {children}
    </div>
  )
}
