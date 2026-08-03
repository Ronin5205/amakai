import * as React from "react"

import { Badge } from "@amakai/shared/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@amakai/shared/components/ui/card"
import { cn } from "@amakai/shared/lib/utils"

export interface MetricCardProps {
  label: React.ReactNode
  value: React.ReactNode
  hint?: React.ReactNode
  delta?: {
    value: string
    positive?: boolean
  }
  icon?: React.ComponentType<{ className?: string }>
}

export function MetricCard({
  label,
  value,
  hint,
  delta,
  icon: Icon,
}: MetricCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-muted-foreground">
          {Icon ? <Icon className="size-4 shrink-0" /> : null}
          {label}
        </CardTitle>
        {delta ? (
          <CardAction>
            <Badge variant={delta.positive ? "outline" : "secondary"}>
              {delta.value}
            </Badge>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="font-heading text-2xl font-medium tracking-tight">
          {value}
        </div>
        {hint ? (
          <p className={cn("text-xs/relaxed text-muted-foreground")}>{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}
