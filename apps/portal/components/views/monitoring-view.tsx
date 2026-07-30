import { MetricCard } from "@/components/portal/metric-card"
import { MetricGrid } from "@/components/portal/metric-grid"
import { ResourceMeter } from "@/components/portal/resource-meter"
import { StatusBadge } from "@/components/portal/status-badge"
import { formatDateTime, formatLatency } from "@/lib/format"
import type {
  ComponentHealth,
  LatencyMetric,
  QueueStats,
  ResourceMetric,
} from "@/lib/domain/monitoring"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@amakai/shared/components/ui/card"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@amakai/shared/components/ui/item"

export interface MonitoringViewProps {
  resourceMetrics: ResourceMetric[]
  latencyMetrics: LatencyMetric[]
  queueStats: QueueStats[]
  componentHealth: ComponentHealth[]
}

export function MonitoringView({
  resourceMetrics,
  latencyMetrics,
  queueStats,
  componentHealth,
}: MonitoringViewProps) {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Resource utilization</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resourceMetrics.map((metric) => (
            <Card key={metric.label}>
              <CardContent className="pt-(--card-spacing)">
                <ResourceMeter
                  label={metric.label}
                  value={metric.percentage}
                  displayValue={`${metric.value}${metric.unit}`}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Latency</h2>
        <div className="flex flex-col gap-6">
          {latencyMetrics.map((metric) => (
            <div key={metric.label} className="flex flex-col gap-4">
              <h3 className="text-xs font-medium text-muted-foreground">
                {metric.label}
              </h3>
              <MetricGrid className="lg:grid-cols-3">
                <MetricCard label="p50" value={formatLatency(metric.p50Ms)} />
                <MetricCard label="p95" value={formatLatency(metric.p95Ms)} />
                <MetricCard label="p99" value={formatLatency(metric.p99Ms)} />
              </MetricGrid>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Queue stats</h2>
        <MetricGrid className="lg:grid-cols-4">
          {queueStats.map((queue) => (
            <Card key={queue.name}>
              <CardHeader>
                <CardTitle className="font-mono text-xs font-medium">
                  {queue.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Depth</span>
                  <span className="font-medium">{queue.depth}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Processing
                  </span>
                  <span className="font-medium">{queue.processing}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Workers</span>
                  <span className="font-medium">{queue.workers}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </MetricGrid>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Component health</h2>
        <ItemGroup>
          {componentHealth.map((component) => (
            <Item key={component.name} variant="outline">
              <ItemContent>
                <ItemTitle className="flex flex-wrap items-center gap-2">
                  {component.name}
                  <StatusBadge status={component.status} />
                </ItemTitle>
                <ItemDescription>
                  Last checked {formatDateTime(component.lastCheckedAt)}
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </section>
    </div>
  )
}
