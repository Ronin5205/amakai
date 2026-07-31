"use client"

import * as React from "react"
import {
  CheckCircleIcon,
  CircleNotchIcon,
  InfoIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react"

import type { ValidationStatus } from "@/hooks/use-workflow-validation"
import type { PlaygroundLogEntry } from "@/lib/engine/types"
import { Button } from "@amakai/shared/components/ui/button"
import { ScrollArea } from "@amakai/shared/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@amakai/shared/components/ui/sheet"
import { cn } from "@amakai/shared/lib/utils"

export interface ValidationPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  status: ValidationStatus
  logs: PlaygroundLogEntry[]
  isRunning: boolean
  onRunValidation: () => void
}

function LogIcon({ level }: { level: PlaygroundLogEntry["level"] }) {
  switch (level) {
    case "success":
      return <CheckCircleIcon className="size-4 shrink-0 text-emerald-600" />
    case "error":
      return <XCircleIcon className="size-4 shrink-0 text-destructive" />
    case "warning":
      return <WarningCircleIcon className="size-4 shrink-0 text-amber-600" />
    default:
      return <InfoIcon className="size-4 shrink-0 text-muted-foreground" />
  }
}

function statusLabel(status: ValidationStatus) {
  switch (status) {
    case "running":
      return "Running playground…"
    case "passed":
      return "Validation passed"
    case "failed":
      return "Validation failed"
    default:
      return "Not validated"
  }
}

function statusClassName(status: ValidationStatus) {
  switch (status) {
    case "passed":
      return "text-emerald-600"
    case "failed":
      return "text-destructive"
    case "running":
      return "text-primary"
    default:
      return "text-muted-foreground"
  }
}

export function ValidationPanel({
  open,
  onOpenChange,
  status,
  logs,
  isRunning,
  onRunValidation,
}: ValidationPanelProps) {
  const logEndRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (open && logs.length > 0) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showOverlay={false}
        className="flex w-full flex-col sm:max-w-md"
      >
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Playground validation</SheetTitle>
          <SheetDescription>
            Runs the workflow in a sandbox environment and logs each step. Deploy
            is enabled only after validation passes.
          </SheetDescription>
        </SheetHeader>

        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <div className="flex items-center gap-2">
            {isRunning ? (
              <CircleNotchIcon className="size-4 animate-spin text-primary" />
            ) : null}
            <span className={cn("text-sm font-medium", statusClassName(status))}>
              {statusLabel(status)}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isRunning}
            onClick={onRunValidation}
          >
            {isRunning ? "Running…" : "Re-run"}
          </Button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-1 p-4 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">
                Click Validate to run the workflow in the playground.
              </p>
            ) : (
              logs.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex gap-2 rounded-none px-2 py-1.5",
                    entry.level === "error" && "bg-destructive/5",
                    entry.level === "success" && "bg-emerald-500/5"
                  )}
                >
                  <LogIcon level={entry.level} />
                  <div className="min-w-0 flex-1">
                    {entry.nodeLabel ? (
                      <span className="text-muted-foreground">
                        [{entry.nodeLabel}]{" "}
                      </span>
                    ) : null}
                    <span>{entry.message}</span>
                  </div>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
