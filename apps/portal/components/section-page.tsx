import * as React from "react"

import { cn } from "@amakai/shared/lib/utils"

export interface SectionPageProps {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  align?: "start" | "center"
  className?: string
}

export function SectionPage({
  eyebrow,
  title,
  description,
  actions,
  children,
  align = "start",
  className,
}: SectionPageProps) {
  const hasChildren = Boolean(children)

  return (
    <div
      className={cn(
        "flex w-full flex-col",
        hasChildren ? "max-w-none gap-6" : "max-w-2xl gap-3",
        className
      )}
    >
      <div
        className={cn(
          actions
            ? "flex items-start justify-between gap-4"
            : "flex flex-col gap-3",
          align === "center" && !actions && "items-center text-center"
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-col gap-3",
            align === "center" && !actions && "items-center"
          )}
        >
          {eyebrow ? (
            <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
              {eyebrow}
            </span>
          ) : null}
          <h1 className="font-heading text-2xl font-medium tracking-tight">
            {title}
          </h1>
          {description ? (
            <p
              className={cn(
                "text-sm/relaxed text-muted-foreground",
                align === "center" && "max-w-2xl"
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
      {children}
    </div>
  )
}
