"use client"

import * as React from "react"

import { StatusBadge } from "@/components/portal/status-badge"
import { formatDateTime } from "@/lib/format"
import type { LogEntry, LogLevel } from "@/lib/domain/monitoring"
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

type LogFilter = "all" | LogLevel

export interface LogsViewProps {
  logs: LogEntry[]
}

export function LogsView({ logs }: LogsViewProps) {
  const [filter, setFilter] = React.useState<LogFilter>("all")

  const filteredLogs = React.useMemo(() => {
    if (filter === "all") return logs
    return logs.filter((log) => log.level === filter)
  }, [logs, filter])

  return (
    <div className="flex flex-col gap-6">
      <ToggleGroup
        variant="outline"
        spacing={0}
        value={[filter]}
        onValueChange={(value) => {
          const next = value[0]
          if (next) setFilter(next as LogFilter)
        }}
      >
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="info">Info</ToggleGroupItem>
        <ToggleGroupItem value="warn">Warn</ToggleGroupItem>
        <ToggleGroupItem value="error">Error</ToggleGroupItem>
        <ToggleGroupItem value="debug">Debug</ToggleGroupItem>
      </ToggleGroup>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Level</TableHead>
            <TableHead>Workflow</TableHead>
            <TableHead>Component</TableHead>
            <TableHead>Message</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredLogs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-muted-foreground">
                {formatDateTime(log.timestamp)}
              </TableCell>
              <TableCell>
                <StatusBadge status={log.level} />
              </TableCell>
              <TableCell className="font-medium">{log.workflowName}</TableCell>
              <TableCell className="font-mono text-muted-foreground">
                {log.component ?? "—"}
              </TableCell>
              <TableCell className="max-w-md whitespace-normal text-muted-foreground">
                {log.message}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
