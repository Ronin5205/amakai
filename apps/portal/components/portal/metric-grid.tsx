import * as React from "react"

import { cn } from "@amakai/shared/lib/utils"

export interface MetricGridProps {
  children: React.ReactNode
  className?: string
}

export function MetricGrid({ children, className }: MetricGridProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4",
        className
      )}
    >
      {children}
    </div>
  )
}
