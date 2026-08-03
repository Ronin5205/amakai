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
import { PayloadIoPanel } from "@/components/design/payload-inspector"
import type {
  ApprovalDecision,
  PlaygroundLogEntry,
  PlaygroundPendingApproval,
  PlaygroundPendingWait,
  PlaygroundStep,
} from "@/lib/engine/types"
import { formatWaitDuration } from "@/lib/design/wait-config"
import {
  formatRemainingWait,
  useWaitCountdown,
} from "@/hooks/use-wait-countdown"
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
  steps?: PlaygroundStep[]
  isRunning: boolean
  pendingApproval?: PlaygroundPendingApproval | null
  pendingWait?: PlaygroundPendingWait | null
  onRunValidation: () => void
  onSubmitApproval?: (decision: ApprovalDecision) => void
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
    case "pending_approval":
      return "Waiting for approval"
    case "pending_wait":
      return "Waiting for timer"
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
    case "pending_approval":
    case "pending_wait":
      return "text-amber-600"
    default:
      return "text-muted-foreground"
  }
}

function ValidationStepEntry({
  step,
}: {
  step: PlaygroundStep
}) {
  const [expanded, setExpanded] = React.useState(false)
  const hasPayload =
    step.inputPayload !== undefined || step.outputPayload !== undefined

  return (
    <div
      className={cn(
        "rounded-none border",
        step.log.level === "error" && "border-destructive/30 bg-destructive/5",
        step.log.level === "success" && "border-emerald-500/20 bg-emerald-500/5",
        step.log.level === "warning" && "border-amber-500/20 bg-amber-500/5"
      )}
    >
      <button
        type="button"
        className={cn(
          "flex w-full items-start gap-2 px-2 py-1.5 text-left",
          hasPayload && "cursor-pointer"
        )}
        onClick={() => {
          if (hasPayload) {
            setExpanded((value) => !value)
          }
        }}
      >
        <LogIcon level={step.log.level} />
        <div className="min-w-0 flex-1">
          {step.log.nodeLabel ? (
            <span className="text-muted-foreground">
              [{step.log.nodeLabel}]{" "}
            </span>
          ) : null}
          <span>{step.log.message}</span>
        </div>
        {hasPayload ? (
          <span className="shrink-0 text-[10px] text-muted-foreground uppercase">
            {expanded ? "Hide JSON" : "JSON"}
          </span>
        ) : null}
      </button>
      {expanded && hasPayload ? (
        <div className="border-t px-2 pb-2">
          <PayloadIoPanel
            className="pt-2"
            input={step.inputPayload}
            output={step.outputPayload}
          />
        </div>
      ) : null}
    </div>
  )
}

export function ValidationPanel({
  open,
  onOpenChange,
  status,
  logs,
  steps = [],
  isRunning,
  pendingApproval,
  pendingWait,
  onRunValidation,
  onSubmitApproval,
}: ValidationPanelProps) {
  const logEndRef = React.useRef<HTMLDivElement>(null)
  const waitRemainingMs = useWaitCountdown(
    status === "pending_wait" ? (pendingWait?.resumeAt ?? null) : null
  )

  React.useEffect(() => {
    if (open && (logs.length > 0 || steps.length > 0)) {
      logEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [logs, open, steps])

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
            Runs the workflow in a sandbox environment and logs each step. The
            run pauses at approval and wait nodes until resolved.
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

        {pendingApproval ? (
          <div className="space-y-3 border-b bg-amber-500/5 px-4 py-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                Paused at {pendingApproval.nodeLabel}
              </span>
              <span className="text-xs text-muted-foreground">
                {pendingApproval.approverType === "manual"
                  ? "Manual approval required to continue"
                  : pendingApproval.approverType === "role"
                    ? `Waiting for role: ${pendingApproval.approverTarget}`
                    : `Waiting for: ${pendingApproval.approverTarget}`}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                disabled={isRunning}
                onClick={() => onSubmitApproval?.("approved")}
              >
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isRunning}
                onClick={() => onSubmitApproval?.("rejected")}
              >
                Reject
              </Button>
            </div>
            {pendingApproval.payload !== undefined ? (
              <PayloadIoPanel input={pendingApproval.payload} />
            ) : null}
          </div>
        ) : null}

        {pendingWait ? (
          <div className="space-y-2 border-b bg-muted/20 px-4 py-3">
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium">
                Paused at {pendingWait.nodeLabel}
              </span>
              <span className="text-xs text-muted-foreground">
                Waiting {formatWaitDuration(pendingWait.durationMs)} —{" "}
                {formatRemainingWait(waitRemainingMs)} remaining
              </span>
            </div>
          </div>
        ) : null}

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 p-4 font-mono text-xs">
            {steps.length === 0 && logs.length === 0 ? (
              <p className="text-muted-foreground">
                Click Validate to run the workflow in the playground.
              </p>
            ) : steps.length > 0 ? (
              steps
                .filter(
                  (step) =>
                    step.type === "node_exit" ||
                    step.type === "node_error" ||
                    step.type === "pending_approval" ||
                    step.type === "pending_wait" ||
                    step.type === "finish_pass" ||
                    step.type === "finish_fail"
                )
                .map((step) => (
                  <ValidationStepEntry key={step.log.id} step={step} />
                ))
            ) : (
              logs.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    "flex gap-2 rounded-none px-2 py-1.5",
                    entry.level === "error" && "bg-destructive/5",
                    entry.level === "success" && "bg-emerald-500/5",
                    entry.level === "warning" && "bg-amber-500/5"
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
