"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { StatusBadge } from "@/components/portal/status-badge"
import { ExecutionDetailSheet } from "@/components/operate/execution-detail-sheet"
import { useReadLogIds } from "@/hooks/use-read-log-ids"
import { formatDateTime, formatDuration } from "@/lib/format"
import type { ExecutionLogDetail } from "@/lib/domain/operate"
import type { ExecutionLogGroup, LogFilter } from "@/lib/domain/monitoring"
import { isAlertLogLevel, matchesLogGroupFilter } from "@/lib/operate/log-levels"
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

export interface LogsViewProps {
  logGroups: ExecutionLogGroup[]
  initialFilter?: LogFilter
  initialExecutionId?: string | null
  getExecutionDetail: (executionId: string) => Promise<ExecutionLogDetail | null>
}

export function LogsView({
  logGroups,
  initialFilter = "all",
  initialExecutionId = null,
  getExecutionDetail,
}: LogsViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isRead, markRead } = useReadLogIds()
  const [filter, setFilter] = React.useState<LogFilter>(initialFilter)
  const [selectedExecutionId, setSelectedExecutionId] = React.useState<
    string | null
  >(initialExecutionId)
  const [executionDetail, setExecutionDetail] =
    React.useState<ExecutionLogDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = React.useState(false)

  React.useEffect(() => {
    setFilter(initialFilter)
  }, [initialFilter])

  const filteredGroups = React.useMemo(
    () => logGroups.filter((group) => matchesLogGroupFilter(group, filter)),
    [filter, logGroups]
  )

  const openExecution = React.useCallback(
    async (executionId: string) => {
      markRead(executionId)

      setSelectedExecutionId(executionId)
      setIsLoadingDetail(true)
      setExecutionDetail(null)

      const detail = await getExecutionDetail(executionId)
      setExecutionDetail(detail)
      setIsLoadingDetail(false)
    },
    [getExecutionDetail, markRead]
  )

  React.useEffect(() => {
    if (!initialExecutionId) {
      return
    }

    void openExecution(initialExecutionId)
  }, [initialExecutionId, openExecution])

  const handleFilterChange = (value: string[]) => {
    const next = value[0] as LogFilter | undefined
    if (!next) return

    setFilter(next)

    const params = new URLSearchParams(searchParams.toString())
    if (next === "all") {
      params.delete("filter")
    } else {
      params.set("filter", next)
    }

    const query = params.toString()
    router.replace(query ? `/operate/logs?${query}` : "/operate/logs")
  }

  const handleGroupClick = (group: ExecutionLogGroup) => {
    void openExecution(group.executionId)
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <ToggleGroup
          variant="outline"
          spacing={0}
          value={[filter]}
          onValueChange={handleFilterChange}
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="alerts">Alerts</ToggleGroupItem>
          <ToggleGroupItem value="info">Info</ToggleGroupItem>
          <ToggleGroupItem value="warn">Warn</ToggleGroupItem>
          <ToggleGroupItem value="error">Error</ToggleGroupItem>
          <ToggleGroupItem value="debug">Debug</ToggleGroupItem>
        </ToggleGroup>

        {filteredGroups.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyTitle>No logs yet</EmptyTitle>
              <EmptyDescription>
                Production runs appear here as grouped execution logs. Select a
                run to inspect every step and log line inside it.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Logs</TableHead>
                <TableHead>Summary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.map((group) => {
                const unreadAlert =
                  isAlertLogLevel(group.level) && !isRead(group.executionId)

                return (
                  <TableRow
                    key={group.executionId}
                    className={cn(
                      "cursor-pointer",
                      unreadAlert && "bg-destructive/5"
                    )}
                    onClick={() => handleGroupClick(group)}
                  >
                    <TableCell className="text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        {unreadAlert ? (
                          <span className="size-2 shrink-0 rounded-full bg-destructive" />
                        ) : null}
                        {formatDateTime(group.startedAt)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={group.level} />
                    </TableCell>
                    <TableCell className="font-medium">
                      {group.workflowName}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={group.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {group.logCount}
                      {group.durationMs !== undefined
                        ? ` · ${formatDuration(group.durationMs)}`
                        : null}
                    </TableCell>
                    <TableCell className="max-w-md whitespace-normal text-muted-foreground">
                      {group.message}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <ExecutionDetailSheet
        open={selectedExecutionId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedExecutionId(null)
            setExecutionDetail(null)

            const params = new URLSearchParams(searchParams.toString())
            params.delete("execution")
            const query = params.toString()
            router.replace(query ? `/operate/logs?${query}` : "/operate/logs")
          }
        }}
        detail={executionDetail}
        isLoading={isLoadingDetail}
      />
    </>
  )
}
