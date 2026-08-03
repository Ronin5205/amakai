import * as React from "react"

import { Progress } from "@amakai/shared/components/ui/progress"
import { cn } from "@amakai/shared/lib/utils"

export interface ResourceMeterProps {
  label: React.ReactNode
  value: number
  unit?: React.ReactNode
  displayValue?: React.ReactNode
  className?: string
}

function clamp(value: number) {
  return Math.min(100, Math.max(0, value))
}

export function ResourceMeter({
  label,
  value,
  unit,
  displayValue,
  className,
}: ResourceMeterProps) {
  const percentage = clamp(value)
  const formatted =
    displayValue ??
    (unit !== undefined ? `${percentage}${unit}` : `${percentage}%`)

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{formatted}</span>
      </div>
      <Progress value={percentage} />
    </div>
  )
}
