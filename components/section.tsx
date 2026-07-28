import * as React from "react"

import { cn } from "@/lib/utils"

export interface SectionProps
  extends Omit<React.ComponentProps<"section">, "title"> {
  /** Anchor target for the nav, e.g. "services". */
  id?: string
  /** Small uppercase tracked label above the heading. */
  eyebrow?: React.ReactNode
  /** Section heading, rendered as an `h2`. */
  title?: React.ReactNode
  description?: React.ReactNode
  /** Horizontal alignment of the heading block. Defaults to "start". */
  align?: "start" | "center"
  /** Classes for the `section-shell` wrapper inside the section. */
  shellClassName?: string
  /** Classes for the eyebrow / title / description block. */
  headerClassName?: string
  /** Classes for the wrapper around `children`. */
  contentClassName?: string
  /** Renders a hairline rule along the top edge of the section. */
  bordered?: boolean
}

/**
 * Consistent shell for every landing section: vertical rhythm, the shared
 * horizontal gutter, and an optional eyebrow / heading / description block.
 */
export function Section({
  id,
  eyebrow,
  title,
  description,
  align = "start",
  className,
  shellClassName,
  headerClassName,
  contentClassName,
  bordered = false,
  children,
  ...props
}: SectionProps) {
  const hasHeader = Boolean(eyebrow || title || description)

  return (
    <section
      id={id}
      data-slot="section"
      className={cn(
        // Header clearance for anchor jumps comes from `scroll-padding-top` on
        // `html`; a scroll margin here as well would double the offset.
        "py-20 sm:py-24 lg:py-32",
        bordered && "border-t border-border",
        className
      )}
      {...props}
    >
      <div className={cn("section-shell", shellClassName)}>
        {hasHeader ? (
          <div
            data-slot="section-header"
            className={cn(
              "flex max-w-2xl flex-col gap-4",
              align === "center" && "mx-auto items-center text-center",
              headerClassName
            )}
          >
            {eyebrow ? (
              <span
                data-slot="section-eyebrow"
                className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase"
              >
                {eyebrow}
              </span>
            ) : null}
            {title ? (
              <h2
                data-slot="section-title"
                className="text-balance font-heading text-3xl font-medium tracking-tight sm:text-4xl"
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <p
                data-slot="section-description"
                className="text-pretty text-sm/relaxed text-muted-foreground sm:text-base/relaxed"
              >
                {description}
              </p>
            ) : null}
          </div>
        ) : null}
        {children ? (
          <div
            data-slot="section-content"
            className={cn(hasHeader && "mt-12 sm:mt-16", contentClassName)}
          >
            {children}
          </div>
        ) : null}
      </div>
    </section>
  )
}
