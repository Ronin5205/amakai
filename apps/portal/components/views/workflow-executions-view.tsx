"use client"

import * as React from "react"
import {
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
  QueueIcon,
  XCircleIcon,
} from "@phosphor-icons/react"

import { JsonPayloadBlock } from "@/components/design/payload-inspector"
import { ExecutionDetailSheet } from "@/components/operate/execution-detail-sheet"
import { MetricCard } from "@/components/portal/metric-card"
import { MetricGrid } from "@/components/portal/metric-grid"
import { StatusBadge } from "@/components/portal/status-badge"
import { formatDateTime, formatDuration } from "@/lib/format"
import type { ExecutionLogDetail } from "@/lib/domain/operate"
import type { WorkflowExecution } from "@/lib/domain/operate"
import type { ExecutionSummary } from "@/lib/domain/execution"
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
import { cn } from "@amakai/shared/lib/utils"

type ExecutionFilter = "all" | "running" | "queued" | "completed" | "failed"

export interface WorkflowExecutionsViewProps {
  executions: WorkflowExecution[]
  summary: ExecutionSummary
  getExecutionDetail?: (executionId: string) => Promise<ExecutionLogDetail | null>
}

export function WorkflowExecutionsView({
  executions,
  summary,
  getExecutionDetail,
}: WorkflowExecutionsViewProps) {
  const [filter, setFilter] = React.useState<ExecutionFilter>("all")
  const [selectedExecutionId, setSelectedExecutionId] = React.useState<
    string | null
  >(null)
  const [expandedExecutionId, setExpandedExecutionId] = React.useState<
    string | null
  >(null)
  const [executionDetail, setExecutionDetail] =
    React.useState<ExecutionLogDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false)

  const filteredExecutions = React.useMemo(() => {
    if (filter === "all") return executions
    return executions.filter((execution) => execution.status === filter)
  }, [executions, filter])

  const openExecution = React.useCallback(
    async (executionId: string) => {
      if (!getExecutionDetail) {
        setExpandedExecutionId((current) =>
          current === executionId ? null : executionId
        )
        return
      }

      setSelectedExecutionId(executionId)
      setIsLoadingDetail(true)
      setExecutionDetail(null)

      const detail = await getExecutionDetail(executionId)
      setExecutionDetail(detail)
      setIsLoadingDetail(false)
    },
    [getExecutionDetail]
  )

  return (
    <>
      <div className="flex flex-col gap-6">
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
            if (next) setFilter(next as ExecutionFilter)
          }}
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="running">Running</ToggleGroupItem>
          <ToggleGroupItem value="queued">Queued</ToggleGroupItem>
          <ToggleGroupItem value="completed">Completed</ToggleGroupItem>
          <ToggleGroupItem value="failed">Failed</ToggleGroupItem>
        </ToggleGroup>

        {filteredExecutions.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No executions yet</EmptyTitle>
              <EmptyDescription>
                Runs for this live workflow will appear here once the workflow is
                triggered in production.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Trigger</TableHead>
                <TableHead>Trigger input</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExecutions.map((execution) => {
                const isExpanded = expandedExecutionId === execution.id

                return (
                  <React.Fragment key={execution.id}>
                    <TableRow
                      className={cn(getExecutionDetail && "cursor-pointer")}
                      onClick={() => {
                        if (getExecutionDetail) {
                          void openExecution(execution.id)
                        }
                      }}
                    >
                      <TableCell>
                        <StatusBadge status={execution.status} />
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">
                        {execution.trigger}
                      </TableCell>
                      <TableCell className="max-w-md whitespace-normal text-muted-foreground">
                        <button
                          type="button"
                          className="text-start hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation()
                            setExpandedExecutionId((current) =>
                              current === execution.id ? null : execution.id
                            )
                          }}
                        >
                          {formatTriggerInputSummary(execution.triggerInput)}
                        </button>
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
                    {isExpanded && execution.triggerInput ? (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-muted/20 p-4">
                          <div className="flex flex-col gap-4">
                            {Object.entries(execution.triggerInput).map(
                              ([nodeId, payload]) => (
                                <JsonPayloadBlock
                                  key={nodeId}
                                  label="Trigger payload"
                                  value={payload}
                                />
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </React.Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {getExecutionDetail ? (
        <ExecutionDetailSheet
          open={selectedExecutionId !== null}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedExecutionId(null)
              setExecutionDetail(null)
            }
          }}
          detail={executionDetail}
          isLoading={isLoadingDetail}
        />
      ) : null}
    </>
  )
}
