"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  ArrowSquareOutIcon,
  ClockIcon,
  GaugeIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react"

import { StatusBadge } from "@/components/portal/status-badge"
import { formatDateTime } from "@/lib/format"
import type { LiveWorkflow } from "@/lib/domain/deployment"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@amakai/shared/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amakai/shared/components/ui/table"
import { cn } from "@amakai/shared/lib/utils"

export interface LiveWorkflowsViewProps {
  workflows: LiveWorkflow[]
  compact?: boolean
  viewAllHref?: string
}

export function LiveWorkflowsView({
  workflows,
  compact = false,
  viewAllHref,
}: LiveWorkflowsViewProps) {
  if (workflows.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No live workflows yet</EmptyTitle>
          <EmptyDescription>
            Validate a workflow in the editor and deploy it to production to see
            it here.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  const visibleWorkflows = compact ? workflows.slice(0, 5) : workflows

  return (
    <div className="flex flex-col gap-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Workflow</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Nodes</TableHead>
            <TableHead>Deployed</TableHead>
            {!compact ? <TableHead className="text-end">Actions</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleWorkflows.map((workflow) => (
            <TableRow key={workflow.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/operate/live-workflows/${workflow.id}/monitoring`}
                  className="hover:underline"
                >
                  {workflow.name}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge status="production" label="Live" />
              </TableCell>
              <TableCell className="capitalize text-muted-foreground">
                <div className="flex flex-col gap-1">
                  <span>{workflow.triggerType ?? "—"}</span>
                  {workflow.webhookUrl ? (
                    <span className="max-w-[220px] truncate text-[11px] normal-case text-muted-foreground/80">
                      {workflow.webhookUrl}
                    </span>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {workflow.nodeCount}
              </TableCell>
              <TableCell className="text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="size-3.5 shrink-0" />
                  {formatDateTime(workflow.deployedAt)}
                </span>
              </TableCell>
              {!compact ? (
                <TableCell className="text-end">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="outline" size="sm" render={<Link href={`/operate/live-workflows/${workflow.id}/monitoring`} />}>
                      <GaugeIcon data-icon="inline-start" />
                      Monitor
                    </Button>
                    <Button variant="outline" size="sm" render={<Link href={`/design/workflow-editor?id=${workflow.id}`} />}>
                      Editor
                      <ArrowSquareOutIcon data-icon="inline-end" />
                    </Button>
                  </div>
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {compact && viewAllHref ? (
        <Link
          href={viewAllHref}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          View all live workflows
        </Link>
      ) : null}
    </div>
  )
}

export interface LiveWorkflowOperateTabsProps {
  workflowId: string
}

export function LiveWorkflowOperateTabs({
  workflowId,
}: LiveWorkflowOperateTabsProps) {
  const pathname = usePathname()
  const basePath = `/operate/live-workflows/${workflowId}`

  const tabs = [
    {
      label: "Monitoring",
      href: `${basePath}/monitoring`,
      icon: GaugeIcon,
    },
    {
      label: "Executions",
      href: `${basePath}/executions`,
      icon: TreeStructureIcon,
    },
  ]

  return (
    <div className="flex flex-wrap gap-2 border-b pb-2">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-2 border px-3 py-1.5 text-sm transition-colors",
              isActive
                ? "border-primary bg-primary/5 text-foreground"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            )}
          >
            <tab.icon className="size-4" />
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
