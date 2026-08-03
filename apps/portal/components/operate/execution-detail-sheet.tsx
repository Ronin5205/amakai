"use client"

import { JsonPayloadBlock } from "@/components/design/payload-inspector"
import { StatusBadge } from "@/components/portal/status-badge"
import { formatDateTime, formatDuration } from "@/lib/format"
import type { ExecutionLogDetail } from "@/lib/domain/operate"
import { formatTriggerInputSummary } from "@/lib/operate/production-execution-insights"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@amakai/shared/components/ui/sheet"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amakai/shared/components/ui/table"

export interface ExecutionDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  detail: ExecutionLogDetail | null
  isLoading?: boolean
}

export function ExecutionDetailSheet({
  open,
  onOpenChange,
  detail,
  isLoading = false,
}: ExecutionDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Execution details</SheetTitle>
          <SheetDescription>
            Step timeline and log output for this workflow run.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading execution…</p>
          ) : !detail ? (
            <p className="text-sm text-muted-foreground">
              Execution details are not available yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Workflow</span>
                  <span className="font-medium">{detail.workflowName}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Status</span>
                  <StatusBadge status={detail.status} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Started</span>
                  <span>{formatDateTime(detail.startedAt)}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground">Duration</span>
                  <span>{formatDuration(detail.durationMs)}</span>
                </div>
                <div className="col-span-2 flex flex-col gap-1">
                  <span className="text-muted-foreground">Trigger input</span>
                  <span>{formatTriggerInputSummary(detail.triggerInput)}</span>
                </div>
              </div>

              {detail.triggerInput ? (
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium">Trigger payload</h3>
                  <div className="flex flex-col gap-4">
                    {Object.entries(detail.triggerInput).map(([nodeId, payload]) => (
                      <JsonPayloadBlock
                        key={nodeId}
                        label="User entries"
                        value={payload}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {detail.steps.length > 0 ? (
                <section className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium">Steps</h3>
                  <div className="flex flex-col gap-2">
                    {detail.steps.map((step) => (
                      <div
                        key={step.nodeId}
                        className="flex items-start justify-between gap-3 border p-3"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">
                            {step.nodeLabel}
                          </span>
                          {step.message ? (
                            <span className="text-xs text-muted-foreground">
                              {step.message}
                            </span>
                          ) : null}
                        </div>
                        <StatusBadge status={step.status} />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section className="flex flex-col gap-3">
                <h3 className="text-sm font-medium">Logs</h3>
                {detail.logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No log lines recorded for this execution.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-muted-foreground">
                            {formatDateTime(log.timestamp)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={log.level} />
                          </TableCell>
                          <TableCell className="whitespace-normal text-muted-foreground">
                            {log.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
