import type { Metadata } from "next"
import { Suspense } from "react"

import { getExecutionDetailAction } from "@/lib/actions/operate-actions"
import { SectionPage } from "@/components/section-page"
import { LogsView } from "@/components/views/logs-view"
import { listExecutionLogGroups } from "@/lib/data/logs"
import type { LogFilter } from "@/lib/domain/monitoring"

export const metadata: Metadata = {
  title: "Logs",
}

function parseLogFilter(value?: string): LogFilter {
  if (
    value === "alerts" ||
    value === "info" ||
    value === "warn" ||
    value === "error" ||
    value === "debug"
  ) {
    return value
  }

  return "all"
}

function LogsContent({
  logGroups,
  initialFilter,
  initialExecutionId,
}: {
  logGroups: Awaited<ReturnType<typeof listExecutionLogGroups>>
  initialFilter: LogFilter
  initialExecutionId: string | null
}) {
  return (
    <LogsView
      logGroups={logGroups}
      initialFilter={initialFilter}
      initialExecutionId={initialExecutionId}
      getExecutionDetail={getExecutionDetailAction}
    />
  )
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; execution?: string }>
}) {
  const params = await searchParams
  const initialFilter = parseLogFilter(params.filter)
  const initialExecutionId = params.execution ?? null
  const logGroups = await listExecutionLogGroups()

  return (
    <SectionPage
      eyebrow="Operate"
      title="Logs"
      description="Production runs grouped by execution. Warnings and errors also surface in your notification bell."
    >
      <Suspense fallback={null}>
        <LogsContent
          logGroups={logGroups}
          initialFilter={initialFilter}
          initialExecutionId={initialExecutionId}
        />
      </Suspense>
    </SectionPage>
  )
}
