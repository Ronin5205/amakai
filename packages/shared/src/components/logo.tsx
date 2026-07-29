import * as React from "react"

import { cn } from "../lib/utils"
import { siteConfig } from "../lib/site-config"

export interface LogoProps extends React.ComponentProps<"span"> {
  /** Hides the wordmark and keeps only the glyph, with an accessible label. */
  iconOnly?: boolean
  /** Classes for the wordmark text. */
  wordmarkClassName?: string
}

/**
 * The Amakai wordmark: circular brand glyph plus the name. Intentionally not
 * a link — wrap it in a `Link` where a link is wanted.
 */
export function Logo({
  className,
  iconOnly = false,
  wordmarkClassName,
  ...props
}: LogoProps) {
  return (
    <span
      data-slot="logo"
      className={cn("inline-flex items-center gap-2", className)}
      {...props}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 64 64"
        fill="none"
        className="size-7 shrink-0 text-primary"
      >
        {/* Outer segmented ring — 18 dashes around the circumference. */}
        <circle
          cx="32"
          cy="32"
          r="29.75"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6.55 3.85"
        />
        {/* Solid inner ring. */}
        <circle
          cx="32"
          cy="32"
          r="23.5"
          stroke="currentColor"
          strokeWidth="5"
        />
        {/*
          Triangle emblem with head (circle) + body (arch) cutouts.
          evenodd punches transparent holes so the page background shows through.
        */}
        <path
          fill="currentColor"
          fillRule="evenodd"
          d="M32 12.5c1.15 0 2.15.55 2.7 1.5l14.2 24.5c.55.95.55 2.15 0 3.1-.55.95-1.55 1.5-2.7 1.5H17.8c-1.15 0-2.15-.55-2.7-1.5-.55-.95-.55-2.15 0-3.1l14.2-24.5c.55-.95 1.55-1.5 2.7-1.5ZM28.75 25.25a3.25 3.25 0 1 0 6.5 0 3.25 3.25 0 1 0-6.5 0ZM26.75 43.1v-7.35a5.25 5.25 0 0 1 10.5 0V43.1h-10.5Z"
        />
      </svg>
      {iconOnly ? (
        <span className="sr-only">{siteConfig.name}</span>
      ) : (
        <span
          className={cn(
            "font-heading text-base font-medium tracking-tight",
            wordmarkClassName
          )}
        >
          {siteConfig.name}
        </span>
      )}
    </span>
  )
}
