import * as React from "react"

import { Badge } from "@amakai/shared/components/ui/badge"
import { cn } from "@amakai/shared/lib/utils"

function formatStatusLabel(status: string) {
  return status.replace(/_/g, " ")
}

function getStatusBadgeClassName(status: string) {
  switch (status.toLowerCase()) {
    case "running":
    case "active":
    case "healthy":
    case "completed":
    case "complete":
    case "pass":
    case "production":
      return "border-primary/35 bg-primary/5 text-primary"
    case "queued":
    case "pending":
    case "pending_approval":
    case "staging":
      return "border-border bg-muted/40 text-muted-foreground"
    case "failed":
    case "fail":
    case "down":
    case "critical":
      return "border-destructive/35 bg-destructive/5 text-destructive"
    case "degraded":
    case "warning":
    case "warn":
      return "border-border bg-muted/30 text-foreground"
    case "info":
    case "development":
      return "border-border bg-background text-muted-foreground"
    default:
      return "border-border bg-muted/30 text-muted-foreground"
  }
}

export interface StatusBadgeProps {
  status: string
  label?: React.ReactNode
  className?: string
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 font-normal capitalize",
        getStatusBadgeClassName(status),
        className
      )}
    >
      {label ?? formatStatusLabel(status)}
    </Badge>
  )
}
