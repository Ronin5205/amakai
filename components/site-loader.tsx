"use client"

import * as React from "react"

import { Logo } from "@/components/logo"
import { cn } from "@/lib/utils"

const SPLASH_SESSION_KEY = "amakai-splash-seen"
const SHOW_MS = 1600
const EXIT_MS = 500

/**
 * Branded splash on the first full load of a tab session. Hidden before paint
 * on return visits in the same session so it never flashes over the page.
 */
export function SiteLoader() {
  const [visible, setVisible] = React.useState(true)
  const [exiting, setExiting] = React.useState(false)

  React.useLayoutEffect(() => {
    try {
      if (sessionStorage.getItem(SPLASH_SESSION_KEY)) {
        setVisible(false)
        return
      }
      sessionStorage.setItem(SPLASH_SESSION_KEY, "1")
    } catch {
      // sessionStorage unavailable — still show the splash once this load.
    }

    document.documentElement.classList.add("splash-active")

    const exitTimer = window.setTimeout(() => setExiting(true), SHOW_MS)
    const hideTimer = window.setTimeout(() => {
      setVisible(false)
      document.documentElement.classList.remove("splash-active")
    }, SHOW_MS + EXIT_MS)

    return () => {
      window.clearTimeout(exitTimer)
      window.clearTimeout(hideTimer)
      document.documentElement.classList.remove("splash-active")
    }
  }, [])

  if (!visible) return null

  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-[100] flex items-center justify-center bg-background",
        exiting
          ? "animate-out fade-out fill-mode-forwards ease-in animation-duration-500 motion-reduce:animate-none motion-reduce:opacity-0"
          : "animate-in fade-in fill-mode-both ease-out animation-duration-500 motion-reduce:animate-none"
      )}
    >
      <Logo
        className={cn(
          "gap-4 [&_svg]:size-16 sm:[&_svg]:size-20",
          exiting
            ? "animate-out fade-out zoom-out-95 fill-mode-forwards ease-in animation-duration-500 motion-reduce:animate-none"
            : "animate-in fade-in zoom-in-95 fill-mode-both ease-out animation-duration-700 motion-reduce:animate-none"
        )}
        wordmarkClassName="text-3xl sm:text-4xl"
      />
    </div>
  )
}
