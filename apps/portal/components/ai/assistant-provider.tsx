"use client"

import * as React from "react"
import { Suspense } from "react"
import { useSearchParams, usePathname, useRouter } from "next/navigation"

import type { AiAssistantStatus, AiQuotaSnapshot } from "@/lib/domain/ai"
import { getAiQuotaAction } from "@/lib/actions/ai-actions"

type AssistantContextValue = {
  open: boolean
  setOpen: (open: boolean) => void
  assistantStatus: AiAssistantStatus
  setAssistantStatus: (status: AiAssistantStatus) => void
  quota: AiQuotaSnapshot | null
  refreshQuota: () => Promise<void>
  threadId: string | null
  setThreadId: (id: string | null) => void
  confirmationToken: string | null
  setConfirmationToken: (token: string | null) => void
}

const AssistantContext = React.createContext<AssistantContextValue | null>(null)

function AssistantDeepLinkListener({
  setOpen,
}: {
  setOpen: (open: boolean) => void
}) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    if (searchParams.get("panel") !== "ai") return
    setOpen(true)
    const params = new URLSearchParams(searchParams.toString())
    params.delete("panel")
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    })
  }, [searchParams, pathname, router, setOpen])

  return null
}

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)
  const [assistantStatus, setAssistantStatus] =
    React.useState<AiAssistantStatus>("idle")
  const [quota, setQuota] = React.useState<AiQuotaSnapshot | null>(null)
  const [threadId, setThreadId] = React.useState<string | null>(null)
  const [confirmationToken, setConfirmationToken] = React.useState<string | null>(
    null
  )

  const refreshQuota = React.useCallback(async () => {
    const result = await getAiQuotaAction()
    if (result.quota) {
      setQuota(result.quota)
      if (result.quota.exhausted) {
        setAssistantStatus("quota-exhausted")
      }
    }
  }, [])

  React.useEffect(() => {
    void refreshQuota()
  }, [refreshQuota])

  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      assistantStatus,
      setAssistantStatus,
      quota,
      refreshQuota,
      threadId,
      setThreadId,
      confirmationToken,
      setConfirmationToken,
    }),
    [open, assistantStatus, quota, refreshQuota, threadId, confirmationToken]
  )

  return (
    <AssistantContext.Provider value={value}>
      <Suspense fallback={null}>
        <AssistantDeepLinkListener setOpen={setOpen} />
      </Suspense>
      {children}
    </AssistantContext.Provider>
  )
}

export function useAssistant() {
  const ctx = React.useContext(AssistantContext)
  if (!ctx) {
    throw new Error("useAssistant must be used within AssistantProvider")
  }
  return ctx
}
