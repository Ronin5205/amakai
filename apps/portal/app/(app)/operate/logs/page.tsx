import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"
import { LogsView } from "@/components/views/logs-view"
import { listLogs } from "@/lib/data/logs"

export const metadata: Metadata = {
  title: "Logs",
}

export default async function Page() {
  const logs = await listLogs()

  return (
    <SectionPage
      eyebrow="Operate"
      title="Logs"
      description="Search and filter workflow log entries by severity, component, and timestamp."
    >
      <LogsView logs={logs} />
    </SectionPage>
  )
}
