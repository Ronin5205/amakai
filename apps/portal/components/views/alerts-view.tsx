"use client"

import * as React from "react"
import { CheckIcon } from "@phosphor-icons/react"

import { StatusBadge } from "@/components/portal/status-badge"
import { formatDateTime } from "@/lib/format"
import type { Alert as AlertRecord, AlertSeverity } from "@/lib/domain/monitoring"
import {
  Alert as AlertCard,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@amakai/shared/components/ui/alert"
import { Button } from "@amakai/shared/components/ui/button"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@amakai/shared/components/ui/toggle-group"

type AlertFilter = "all" | AlertSeverity

export interface AlertsViewProps {
  alerts: AlertRecord[]
}

export function AlertsView({ alerts }: AlertsViewProps) {
  const [filter, setFilter] = React.useState<AlertFilter>("all")

  const filteredAlerts = React.useMemo(() => {
    if (filter === "all") return alerts
    return alerts.filter((alert) => alert.severity === filter)
  }, [alerts, filter])

  return (
    <div className="flex flex-col gap-6">
      <ToggleGroup
        variant="outline"
        spacing={0}
        value={[filter]}
        onValueChange={(value) => {
          const next = value[0]
          if (next) setFilter(next as AlertFilter)
        }}
      >
        <ToggleGroupItem value="all">All</ToggleGroupItem>
        <ToggleGroupItem value="critical">Critical</ToggleGroupItem>
        <ToggleGroupItem value="warning">Warning</ToggleGroupItem>
        <ToggleGroupItem value="info">Info</ToggleGroupItem>
      </ToggleGroup>

      <div className="flex flex-col gap-4">
        {filteredAlerts.map((alert) => (
          <AlertCard
            key={alert.id}
            variant={alert.severity === "critical" ? "destructive" : "default"}
          >
            <AlertTitle className="flex flex-wrap items-center gap-2">
              <StatusBadge status={alert.severity} />
              {alert.title}
            </AlertTitle>
            <AlertDescription>{alert.message}</AlertDescription>
            <div className="col-start-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{alert.source}</span>
              <span>{formatDateTime(alert.timestamp)}</span>
              {alert.acknowledged ? (
                <StatusBadge status="completed" label="Acknowledged" />
              ) : null}
            </div>
            <AlertAction>
              <Button variant="outline" size="sm" disabled>
                <CheckIcon data-icon="inline-start" />
                Acknowledge
              </Button>
            </AlertAction>
          </AlertCard>
        ))}
      </div>
    </div>
  )
}
