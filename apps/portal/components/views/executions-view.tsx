"use client"

import * as React from "react"
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
import type { Execution, ExecutionSummary } from "@/lib/domain/execution"
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

type ExecutionFilter = "all" | "running" | "queued" | "completed" | "failed"

export interface ExecutionsViewProps {
  executions: Execution[]
  summary: ExecutionSummary
}

export function ExecutionsView({ executions, summary }: ExecutionsViewProps) {
  const [filter, setFilter] = React.useState<ExecutionFilter>("all")

  const filteredExecutions = React.useMemo(() => {
    if (filter === "all") return executions
    return executions.filter((execution) => execution.status === filter)
  }, [executions, filter])

  return (
    <div className="flex flex-col gap-6">
      <MetricGrid>
        <MetricCard
          label="Running"
          value={summary.running}
          icon={PlayIcon}
        />
        <MetricCard
          label="Queued"
          value={summary.queued}
          icon={QueueIcon}
        />
        <MetricCard
          label="Completed"
          value={summary.completed}
          icon={CheckCircleIcon}
        />
        <MetricCard
          label="Failed"
          value={summary.failed}
          icon={XCircleIcon}
        />
      </MetricGrid>

      <ToggleGroup
        variant="outline"
        spacing={0}
        value={[filter]}
        onValueChange={(value) => {
          const next = value[0]
          if (next) setFilter(next as ExecutionFilter)
        }}
      >
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="running">Running</ToggleGroupItem>
        <ToggleGroupItem value="queued">Queued</ToggleGroupItem>
        <ToggleGroupItem value="completed">Completed</ToggleGroupItem>
        <ToggleGroupItem value="failed">Failed</ToggleGroupItem>
      </ToggleGroup>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Workflow</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Environment</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Duration</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredExecutions.map((execution) => (
            <TableRow key={execution.id}>
              <TableCell className="font-medium">
                {execution.workflowName}
              </TableCell>
              <TableCell>
                <StatusBadge status={execution.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {execution.trigger}
              </TableCell>
              <TableCell className="capitalize text-muted-foreground">
                {execution.environment}
              </TableCell>
              <TableCell className="text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="size-3.5 shrink-0" />
                  {formatDateTime(execution.startedAt)}
                </span>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDuration(execution.durationMs)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
