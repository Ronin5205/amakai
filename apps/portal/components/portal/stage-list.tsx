import * as React from "react"
import {
  CheckCircleIcon,
  CircleIcon,
  MinusCircleIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react"

import { StatusBadge } from "@/components/portal/status-badge"
import { cn } from "@amakai/shared/lib/utils"

export type StageStatus =
  | "pending"
  | "active"
  | "complete"
  | "pass"
  | "fail"
  | "warn"

export interface Stage {
  order: number
  name: React.ReactNode
  description?: React.ReactNode
  status: StageStatus
}

export interface StageListProps {
  stages: Stage[]
  className?: string
}

function StageIndicator({ status }: { status: StageStatus }) {
  switch (status) {
    case "active":
      return (
        <CircleIcon
          weight="fill"
          className="size-5 shrink-0 text-primary"
        />
      )
    case "complete":
    case "pass":
      return (
        <CheckCircleIcon
          weight="fill"
          className="size-5 shrink-0 text-primary"
        />
      )
    case "fail":
      return (
        <XCircleIcon
          weight="fill"
          className="size-5 shrink-0 text-destructive"
        />
      )
    case "warn":
      return (
        <WarningCircleIcon
          weight="fill"
          className="size-5 shrink-0 text-muted-foreground"
        />
      )
    case "pending":
    default:
      return (
        <MinusCircleIcon className="size-5 shrink-0 text-muted-foreground" />
      )
  }
}

export function StageList({ stages, className }: StageListProps) {
  const sorted = [...stages].sort((a, b) => a.order - b.order)

  return (
    <ol className={cn("flex flex-col gap-4", className)}>
      {sorted.map((stage) => (
        <li
          key={stage.order}
          className={cn(
            "flex gap-4 rounded-lg border border-border p-4",
            stage.status === "active" && "border-primary/40 bg-muted/30",
            stage.status === "fail" && "border-destructive/30",
            stage.status === "warn" && "border-border bg-muted/20"
          )}
        >
          <div className="flex flex-col items-center gap-2">
            <StageIndicator status={stage.status} />
            <span className="text-xs font-medium text-muted-foreground">
              {stage.order}
            </span>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{stage.name}</span>
              <StatusBadge status={stage.status} />
            </div>
            {stage.description ? (
              <p className="text-xs/relaxed text-muted-foreground">
                {stage.description}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  )
}
