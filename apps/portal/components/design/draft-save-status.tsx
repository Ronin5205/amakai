"use client"

import { CheckCircleIcon, CloudArrowUpIcon, WarningCircleIcon } from "@phosphor-icons/react"

import type { DraftSaveStatus } from "@/hooks/use-workflow-auto-save"
import { Badge } from "@amakai/shared/components/ui/badge"
import { Spinner } from "@amakai/shared/components/ui/spinner"
import { cn } from "@amakai/shared/lib/utils"

export interface DraftSaveStatusProps {
  status: DraftSaveStatus
  error?: string | null
  className?: string
}

export function DraftSaveStatus({
  status,
  error,
  className,
}: DraftSaveStatusProps) {
  if (status === "error") {
    return (
      <Badge variant="destructive" className={cn("gap-1.5 font-normal", className)}>
        <WarningCircleIcon className="size-3.5" />
        {error ?? "Save failed"}
      </Badge>
    )
  }

  if (status === "saving") {
    return (
      <Badge variant="outline" className={cn("gap-1.5 font-normal", className)}>
        <Spinner className="size-3.5" />
        Saving…
      </Badge>
    )
  }

  if (status === "pending") {
    return (
      <Badge variant="outline" className={cn("gap-1.5 font-normal", className)}>
        <CloudArrowUpIcon className="size-3.5" />
        Unsaved changes
      </Badge>
    )
  }

  if (status === "saved") {
    return (
      <Badge variant="outline" className={cn("gap-1.5 font-normal", className)}>
        <CheckCircleIcon className="size-3.5 text-emerald-600" />
        Saved
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={cn("gap-1.5 font-normal", className)}>
      <CloudArrowUpIcon className="size-3.5" />
      Draft
    </Badge>
  )
}
