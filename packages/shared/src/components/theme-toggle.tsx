"use client"

import * as React from "react"
import { MoonIcon, SunIcon } from "@phosphor-icons/react/ssr"

import { Button } from "./ui/button"
import { resolveInitialTheme, setTheme, type Theme } from "../lib/theme"

export type ThemeToggleProps = Omit<
  React.ComponentProps<typeof Button>,
  "children"
>

/**
 * Flips between the light and dark token sets. The inline script in the root
 * layout has already applied a theme by the time this mounts, so the toggle
 * only has to read that same source of truth and invert it.
 */
export function ThemeToggle({
  variant = "ghost",
  size = "icon-sm",
  onClick,
  ...props
}: ThemeToggleProps) {
  // Resolves to "light" on the server and to the real theme when the
  // initializer runs again on the client at hydration. Nothing below renders
  // the value, so the two passes cannot disagree.
  const [theme, setThemeState] = React.useState<Theme>(resolveInitialTheme)

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label="Toggle color theme"
      onClick={(event) => {
        onClick?.(event)
        const next: Theme = theme === "dark" ? "light" : "dark"
        setTheme(next)
        setThemeState(next)
      }}
      {...props}
    >
      {/* Which glyph shows is driven by the `.dark` class rather than by state,
          so the server and client markup are always identical. */}
      <SunIcon className="hidden dark:block" />
      <MoonIcon className="block dark:hidden" />
    </Button>
  )
}
