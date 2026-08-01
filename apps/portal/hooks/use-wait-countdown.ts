"use client"

import * as React from "react"

import { formatWaitDuration } from "@/lib/design/wait-config"

export function useWaitCountdown(resumeAt: number | null) {
  const [remainingMs, setRemainingMs] = React.useState(0)

  React.useEffect(() => {
    if (!resumeAt) {
      setRemainingMs(0)
      return
    }

    const tick = () => {
      setRemainingMs(Math.max(0, resumeAt - Date.now()))
    }

    tick()
    const intervalId = window.setInterval(tick, 100)

    return () => window.clearInterval(intervalId)
  }, [resumeAt])

  return remainingMs
}

export function formatRemainingWait(remainingMs: number) {
  if (remainingMs <= 0) {
    return "Resuming…"
  }

  return formatWaitDuration(Math.ceil(remainingMs))
}
