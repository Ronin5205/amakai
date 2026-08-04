"use client"

import * as React from "react"

import {
  applyTheme,
  getSystemTheme,
  getThemePreference,
  resolveInitialTheme,
} from "../lib/theme"

/**
 * Re-applies the stored/system theme after mount. Needed when React recovers
 * from a hydration mismatch by regenerating the tree on the client — inline
 * `<script>` tags are not re-executed in that path, so the `.dark` class that
 * the pre-paint script set can be lost.
 */
export function ThemeBootstrap() {
  React.useLayoutEffect(() => {
    applyTheme(resolveInitialTheme())

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const onSystemThemeChange = () => {
      if (getThemePreference() === "system") {
        applyTheme(getSystemTheme())
      }
    }

    media.addEventListener("change", onSystemThemeChange)
    return () => media.removeEventListener("change", onSystemThemeChange)
  }, [])

  return null
}
