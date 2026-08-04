"use client"

import * as React from "react"
import { DesktopIcon, MoonIcon, SunIcon } from "@phosphor-icons/react"

import { themeMenuOptions } from "@/lib/navigation"
import { Button } from "@amakai/shared/components/ui/button"
import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from "@amakai/shared/lib/theme"
import { cn } from "@amakai/shared/lib/utils"

const themeIcons = {
  light: SunIcon,
  dark: MoonIcon,
  system: DesktopIcon,
} as const

export function ThemePreferencePicker({ className }: { className?: string }) {
  // Default to "system" on both server and first client paint so hydration
  // matches; read the real preference after mount.
  const [preference, setPreference] =
    React.useState<ThemePreference>("system")

  React.useEffect(() => {
    setPreference(getThemePreference())
  }, [])

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {themeMenuOptions.map((option) => {
        const Icon = themeIcons[option.value]
        const isActive = preference === option.value

        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={isActive ? "secondary" : "outline"}
            aria-pressed={isActive}
            onClick={() => {
              setThemePreference(option.value)
              setPreference(option.value)
            }}
          >
            <Icon data-icon="inline-start" />
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
