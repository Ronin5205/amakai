import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"
import { MonitoringView } from "@/components/views/monitoring-view"
import {
  getComponentHealth,
  getLatencyMetrics,
  getQueueStats,
  getResourceMetrics,
} from "@/lib/data/monitoring"

export const metadata: Metadata = {
  title: "Monitoring",
}

export default async function Page() {
  const [resourceMetrics, latencyMetrics, queueStats, componentHealth] =
    await Promise.all([
      getResourceMetrics(),
      getLatencyMetrics(),
      getQueueStats(),
      getComponentHealth(),
    ])

  return (
    <SectionPage
      eyebrow="Operate"
      title="Monitoring"
      description="Observe platform resources, latency, queue depth, and component health in real time."
    >
      <MonitoringView
        resourceMetrics={resourceMetrics}
        latencyMetrics={latencyMetrics}
        queueStats={queueStats}
        componentHealth={componentHealth}
      />
    </SectionPage>
  )
}
