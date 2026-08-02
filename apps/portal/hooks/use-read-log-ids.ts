"use client"

import * as React from "react"

const STORAGE_KEY = "amakai-read-log-ids"
const READ_LOGS_EVENT = "amakai-read-logs-changed"

function readStoredIds() {
  if (typeof window === "undefined") {
    return new Set<string>()
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return new Set<string>()
    }

    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return new Set<string>()
    }

    return new Set(parsed.filter((id): id is string => typeof id === "string"))
  } catch {
    return new Set<string>()
  }
}

function writeStoredIds(ids: Set<string>) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]))
  window.dispatchEvent(new Event(READ_LOGS_EVENT))
}

export function useReadLogIds() {
  const [readIds, setReadIds] = React.useState<Set<string>>(readStoredIds)

  React.useEffect(() => {
    const syncFromStorage = () => {
      setReadIds(readStoredIds())
    }

    window.addEventListener("storage", syncFromStorage)
    window.addEventListener(READ_LOGS_EVENT, syncFromStorage)
    return () => {
      window.removeEventListener("storage", syncFromStorage)
      window.removeEventListener(READ_LOGS_EVENT, syncFromStorage)
    }
  }, [])

  const markRead = React.useCallback((logIds: string | string[]) => {
    const ids = Array.isArray(logIds) ? logIds : [logIds]
    setReadIds((current) => {
      const next = new Set(current)
      for (const id of ids) {
        next.add(id)
      }
      writeStoredIds(next)
      return next
    })
  }, [])

  const markAllRead = React.useCallback((logIds: string[]) => {
    markRead(logIds)
  }, [markRead])

  const isRead = React.useCallback(
    (logId: string) => readIds.has(logId),
    [readIds]
  )

  return { readIds, markRead, markAllRead, isRead }
}
