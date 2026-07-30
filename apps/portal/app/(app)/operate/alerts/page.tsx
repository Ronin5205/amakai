import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"
import { AlertsView } from "@/components/views/alerts-view"
import { listAlerts } from "@/lib/data/alerts"

export const metadata: Metadata = {
  title: "Alerts",
}

export default async function Page() {
  const alerts = await listAlerts()

  return (
    <SectionPage
      eyebrow="Operate"
      title="Alerts"
      description="Review platform alerts by severity and acknowledge incidents when resolved."
    >
      <AlertsView alerts={alerts} />
    </SectionPage>
  )
}
