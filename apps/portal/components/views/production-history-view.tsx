"use client"

import * as React from "react"
import Link from "next/link"
import {
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  QueueIcon,
  XCircleIcon,
} from "@phosphor-icons/react"

import { MetricCard } from "@/components/portal/metric-card"
import { MetricGrid } from "@/components/portal/metric-grid"
import { StatusBadge } from "@/components/portal/status-badge"
import { formatDateTime, formatDuration } from "@/lib/format"
import type { ProductionRun, ProductionRunSummary } from "@/lib/domain/production"
import { formatTriggerInputSummary } from "@/lib/operate/production-execution-insights"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@amakai/shared/components/ui/empty"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@amakai/shared/components/ui/toggle-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amakai/shared/components/ui/table"

type RunFilter = "all" | "running" | "queued" | "completed" | "failed"

export interface ProductionHistoryViewProps {
  runs: ProductionRun[]
  summary: ProductionRunSummary
  compact?: boolean
  viewAllHref?: string
}

export function ProductionHistoryView({
  runs,
  summary,
  compact = false,
  viewAllHref,
}: ProductionHistoryViewProps) {
  const [filter, setFilter] = React.useState<RunFilter>("all")

  const filteredRuns = React.useMemo(() => {
    const visible = compact ? runs.slice(0, 5) : runs
    if (filter === "all") return visible
    return visible.filter((run) => run.status === filter)
  }, [compact, filter, runs])

  if (runs.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyTitle>No production runs yet</EmptyTitle>
          <EmptyDescription>
            Start a run from Production → Runs to execute a deployed workflow.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {!compact ? (
        <>
          <MetricGrid>
            <MetricCard label="Running" value={summary.running} icon={PlayIcon} />
            <MetricCard label="Queued" value={summary.queued} icon={QueueIcon} />
            <MetricCard
              label="Completed"
              value={summary.completed}
              icon={CheckCircleIcon}
            />
            <MetricCard label="Failed" value={summary.failed} icon={XCircleIcon} />
          </MetricGrid>

          <ToggleGroup
            variant="outline"
            spacing={0}
            value={[filter]}
            onValueChange={(value) => {
              const next = value[0]
              if (next) setFilter(next as RunFilter)
            }}
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="running">Running</ToggleGroupItem>
            <ToggleGroupItem value="queued">Queued</ToggleGroupItem>
            <ToggleGroupItem value="completed">Completed</ToggleGroupItem>
            <ToggleGroupItem value="failed">Failed</ToggleGroupItem>
          </ToggleGroup>
        </>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Workflow</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Trigger</TableHead>
            {!compact ? <TableHead>Trigger input</TableHead> : null}
            <TableHead>Started</TableHead>
            {!compact ? <TableHead>Duration</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRuns.map((run) => (
            <TableRow key={run.id}>
              <TableCell className="font-medium">
                <Link
                  href={`/operate/live-workflows/${run.workflowId}/executions`}
                  className="hover:underline"
                >
                  {run.workflowName}
                </Link>
              </TableCell>
              <TableCell>
                <StatusBadge status={run.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">{run.trigger}</TableCell>
              {!compact ? (
                <TableCell className="max-w-md whitespace-normal text-muted-foreground">
                  {formatTriggerInputSummary(run.triggerInput)}
                </TableCell>
              ) : null}
              <TableCell className="text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="size-3.5 shrink-0" />
                  {formatDateTime(run.startedAt)}
                </span>
              </TableCell>
              {!compact ? (
                <TableCell className="text-muted-foreground">
                  {formatDuration(run.durationMs)}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {compact && viewAllHref ? (
        <div>
          <Link
            href={viewAllHref}
            className="text-sm font-medium text-primary hover:underline"
          >
            View all runs
          </Link>
        </div>
      ) : null}
    </div>
  )
}
