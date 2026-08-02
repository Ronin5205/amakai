import { MetricCard } from "@/components/portal/metric-card"
import { MetricGrid } from "@/components/portal/metric-grid"
import { ResourceMeter } from "@/components/portal/resource-meter"
import { StatusBadge } from "@/components/portal/status-badge"
import { formatDateTime } from "@/lib/format"
import type { WorkflowMonitoringSnapshot } from "@/lib/domain/operate"
import {
  Card,
  CardContent,
} from "@amakai/shared/components/ui/card"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@amakai/shared/components/ui/item"

export interface WorkflowMonitoringViewProps {
  snapshot: WorkflowMonitoringSnapshot
}

export function WorkflowMonitoringView({
  snapshot,
}: WorkflowMonitoringViewProps) {
  return (
    <div className="flex flex-col gap-8">
      {snapshot.sections.map((section) => (
        <section key={section.id} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium">{section.title}</h2>
            {section.description ? (
              <p className="text-sm text-muted-foreground">
                {section.description}
              </p>
            ) : null}
          </div>

          {section.metrics.some((metric) => metric.percentage !== undefined) ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.metrics.map((metric) =>
                metric.percentage !== undefined ? (
                  <Card key={`${section.id}-${metric.label}`}>
                    <CardContent className="pt-(--card-spacing)">
                      <ResourceMeter
                        label={metric.label}
                        value={metric.percentage}
                        displayValue={`${metric.value}${metric.unit ?? ""}`}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <MetricCard
                    key={`${section.id}-${metric.label}`}
                    label={metric.label}
                    value={`${metric.value}${metric.unit ? ` ${metric.unit}` : ""}`}
                  />
                )
              )}
            </div>
          ) : (
            <MetricGrid className="lg:grid-cols-4">
              {section.metrics.map((metric) => (
                <MetricCard
                  key={`${section.id}-${metric.label}`}
                  label={metric.label}
                  value={`${metric.value}${metric.unit ? ` ${metric.unit}` : ""}`}
                />
              ))}
            </MetricGrid>
          )}
        </section>
      ))}

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Node health</h2>
        <ItemGroup>
          {snapshot.nodeHealth.map((node) => (
            <Item key={node.nodeId} variant="outline">
              <ItemContent>
                <ItemTitle className="flex flex-wrap items-center gap-2">
                  {node.label}
                  <StatusBadge status={node.status} />
                </ItemTitle>
                <ItemDescription className="capitalize">
                  {node.kind} · Last checked {formatDateTime(node.lastCheckedAt)}
                </ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </section>
    </div>
  )
}
