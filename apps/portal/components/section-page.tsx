import * as React from "react"

export interface SectionPageProps {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
}

/**
 * Minimal page shell for portal section stubs. Typography mirrors the landing
 * section header so every route feels consistent before real content ships.
 */
export function SectionPage({ eyebrow, title, description }: SectionPageProps) {
  return (
    <div className="flex max-w-2xl flex-col gap-3">
      {eyebrow ? (
        <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {eyebrow}
        </span>
      ) : null}
      <h1 className="font-heading text-2xl font-medium tracking-tight">
        {title}
      </h1>
      {description ? (
        <p className="text-sm/relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
