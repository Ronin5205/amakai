"use client"

import * as React from "react"
import {
  CheckCircleIcon,
  CircleNotchIcon,
  FlaskIcon,
  InfoIcon,
  PlayIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react"

import { PayloadIoPanel } from "@/components/design/payload-inspector"
import { StatusBadge } from "@/components/portal/status-badge"
import { formatWaitDuration } from "@/lib/design/wait-config"
import {
  formatRemainingWait,
  useWaitCountdown,
} from "@/hooks/use-wait-countdown"
import { useWorkflowTesting } from "@/hooks/use-workflow-testing"
import type { PlaygroundLogEntry, PlaygroundStep } from "@/lib/engine/types"
import type { Workflow } from "@/lib/domain/workflow"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@amakai/shared/components/ui/empty"
import { Input } from "@amakai/shared/components/ui/input"
import { Label } from "@amakai/shared/components/ui/label"
import { ScrollArea } from "@amakai/shared/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@amakai/shared/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amakai/shared/components/ui/table"
import { Textarea } from "@amakai/shared/components/ui/textarea"
import { cn } from "@amakai/shared/lib/utils"

export interface TestingViewProps {
  workflows: Workflow[]
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

function stepTypeLabel(type: PlaygroundStep["type"]) {
  switch (type) {
    case "node_enter":
      return "Enter"
    case "node_exit":
      return "Exit"
    case "node_error":
      return "Error"
    case "edge_fire":
      return "Signal"
    case "start":
      return "Start"
    case "finish_pass":
      return "Complete"
    case "pending_approval":
      return "Awaiting approval"
    case "pending_wait":
      return "Waiting"
    default:
      return type
  }
}

function TestStepRow({ step }: { step: PlaygroundStep }) {
  const [expanded, setExpanded] = React.useState(false)
  const hasPayload = step.inputPayload !== undefined || step.outputPayload !== undefined

  return (
    <>
      <TableRow
        className={cn(
          hasPayload && "cursor-pointer",
          step.log.level === "error" && "bg-destructive/5"
        )}
        onClick={() => {
          if (hasPayload) {
            setExpanded((value) => !value)
          }
        }}
      >
        <TableCell className="text-muted-foreground">
          <div className="flex items-center gap-2">
            <LogIcon level={step.log.level} />
            <StatusBadge status={stepTypeLabel(step.type)} />
          </div>
        </TableCell>
        <TableCell className="font-medium">
          {step.log.nodeLabel ?? "—"}
        </TableCell>
        <TableCell className="max-w-md whitespace-normal text-muted-foreground">
          {step.log.message}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {hasPayload ? (expanded ? "Hide I/O" : "Show I/O") : "—"}
        </TableCell>
      </TableRow>
      {expanded && hasPayload ? (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={4} className="p-0">
            <div className="p-4">
              <PayloadIoPanel
                input={step.inputPayload}
                output={step.outputPayload}
              />
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  )
}

function statusLabel(status: ReturnType<typeof useWorkflowTesting>["status"]) {
  switch (status) {
    case "running":
      return "Running test…"
    case "passed":
      return "Test passed"
    case "pending_approval":
      return "Waiting for approval"
    case "pending_wait":
      return "Waiting for timer"
    case "failed":
      return "Test failed"
    default:
      return "Ready to test"
  }
}

export function TestingView({ workflows }: TestingViewProps) {
  const [selectedWorkflowId, setSelectedWorkflowId] = React.useState<string>("")

  const selectedWorkflow = React.useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? null,
    [selectedWorkflowId, workflows]
  )

  const {
    status,
    steps,
    errorMessage,
    pendingApproval,
    pendingWait,
    requirements,
    triggerValues,
    useCustomJson,
    customJsonPayload,
    setUseCustomJson,
    setCustomJsonPayload,
    setTriggerFieldValue,
    runTest,
    submitApproval,
    resetRun,
    isRunning,
  } = useWorkflowTesting(selectedWorkflow)

  const waitRemainingMs = useWaitCountdown(
    status === "pending_wait" ? (pendingWait?.resumeAt ?? null) : null
  )

  React.useEffect(() => {
    if (!selectedWorkflowId && workflows.length > 0) {
      setSelectedWorkflowId(workflows[0].id)
    }
  }, [selectedWorkflowId, workflows])

  React.useEffect(() => {
    resetRun()
  }, [resetRun, selectedWorkflowId])

  const workflowItems = React.useMemo(
    () =>
      workflows.map((workflow) => ({
        value: workflow.id,
        label: workflow.name,
      })),
    [workflows]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-3">
          <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Design
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              Testing
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Run workflows with manual trigger payloads and simulate human
              inputs. Each step shows detailed input and output data, like logs
              with full context.
            </p>
          </div>
        </div>
      </div>

      {workflows.length === 0 ? (
        <Empty className="min-h-[320px] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FlaskIcon />
            </EmptyMedia>
            <EmptyTitle>No workflows to test</EmptyTitle>
            <EmptyDescription>
              Create a workflow first, then return here to test it with custom
              payloads.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid min-h-0 flex-1 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3 border p-4">
              <Label htmlFor="workflow-select">Workflow</Label>
              <Select
                items={workflowItems}
                value={selectedWorkflowId || null}
                onValueChange={(value) => {
                  if (typeof value === "string") {
                    setSelectedWorkflowId(value)
                  }
                }}
              >
                <SelectTrigger id="workflow-select" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} side="bottom">
                  <SelectGroup>
                    {workflowItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {requirements?.triggers.length ? (
              <div className="flex flex-col gap-4 border p-4">
                <div className="flex flex-col gap-1">
                  <h2 className="text-sm font-medium">Trigger payload</h2>
                  <p className="text-xs text-muted-foreground">
                    Provide values for each trigger output field. Array fields
                    use comma-separated values (e.g. ord-1, ord-2). Object
                    fields use JSON. Or paste a full custom JSON object.
                  </p>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useCustomJson}
                    onChange={(event) => setUseCustomJson(event.target.checked)}
                  />
                  Use custom JSON payload
                </label>

                {useCustomJson ? (
                  <Textarea
                    value={customJsonPayload}
                    onChange={(event) => setCustomJsonPayload(event.target.value)}
                    className="min-h-40 font-mono text-xs"
                    placeholder='{"orders": [{"orderId": "1"}, {"orderId": "2"}], "batchId": "batch-1"}'
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    {requirements.triggers.map((trigger) => (
                      <div key={trigger.nodeId} className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">
                            {trigger.nodeLabel}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {trigger.triggerType} trigger
                          </span>
                        </div>
                        {trigger.outputFields.length === 0 ? (
                          <p className="text-xs text-amber-600">
                            This trigger has no output fields defined. Add fields
                            in the workflow editor before testing.
                          </p>
                        ) : (
                          trigger.outputFields.map((field) => (
                            <div key={field.name} className="flex flex-col gap-2">
                              <Label htmlFor={`${trigger.nodeId}-${field.name}`}>
                                {field.name}
                                <span className="ml-2 text-xs font-normal text-muted-foreground capitalize">
                                  ({field.type})
                                </span>
                              </Label>
                              {field.type === "object" ? (
                                <Textarea
                                  id={`${trigger.nodeId}-${field.name}`}
                                  value={
                                    triggerValues[trigger.nodeId]?.[field.name] ?? ""
                                  }
                                  onChange={(event) =>
                                    setTriggerFieldValue(
                                      trigger.nodeId,
                                      field.name,
                                      event.target.value
                                    )
                                  }
                                  className="min-h-24 font-mono text-xs"
                                  placeholder='{"id": "1", "name": "Example"}'
                                />
                              ) : field.type === "array" ? (
                                <Input
                                  id={`${trigger.nodeId}-${field.name}`}
                                  value={
                                    triggerValues[trigger.nodeId]?.[field.name] ?? ""
                                  }
                                  onChange={(event) =>
                                    setTriggerFieldValue(
                                      trigger.nodeId,
                                      field.name,
                                      event.target.value
                                    )
                                  }
                                  placeholder="value1, value2, value3"
                                />
                              ) : (
                                <Input
                                  id={`${trigger.nodeId}-${field.name}`}
                                  value={
                                    triggerValues[trigger.nodeId]?.[field.name] ?? ""
                                  }
                                  onChange={(event) =>
                                    setTriggerFieldValue(
                                      trigger.nodeId,
                                      field.name,
                                      event.target.value
                                    )
                                  }
                                  placeholder="Value or JSON literal"
                                />
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {requirements?.humanInputs.length ? (
              <div className="flex flex-col gap-2 border p-4">
                <h2 className="text-sm font-medium">Approval steps</h2>
                <p className="text-xs text-muted-foreground">
                  This workflow pauses at approval nodes until you approve or
                  reject during the test run.
                </p>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {requirements.humanInputs.map((input) => (
                    <li key={input.nodeId}>
                      <span className="font-medium text-foreground">
                        {input.nodeLabel}
                      </span>
                      {" — "}
                      {input.approverType === "manual"
                        ? "Manual approval"
                        : input.approverType === "role"
                          ? `Role: ${input.approverTarget}`
                          : `Email: ${input.approverTarget}`}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {requirements?.waitSteps.length ? (
              <div className="flex flex-col gap-2 border p-4">
                <h2 className="text-sm font-medium">Wait steps</h2>
                <p className="text-xs text-muted-foreground">
                  The workflow pauses at wait nodes until the configured duration
                  has passed.
                </p>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {requirements.waitSteps.map((step) => (
                    <li key={step.nodeId}>
                      <span className="font-medium text-foreground">
                        {step.nodeLabel}
                      </span>
                      {" — "}
                      {step.durationLabel}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <Button onClick={runTest} disabled={isRunning || !selectedWorkflow}>
              {isRunning ? (
                <CircleNotchIcon className="animate-spin" data-icon="inline-start" />
              ) : (
                <PlayIcon data-icon="inline-start" />
              )}
              {isRunning ? "Running test…" : "Run test"}
            </Button>
          </div>

          <div className="flex min-h-0 flex-col gap-4 border">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div className="flex items-center gap-2">
                {isRunning ? (
                  <CircleNotchIcon className="size-4 animate-spin text-primary" />
                ) : null}
                <span
                  className={cn(
                    "text-sm font-medium",
                    status === "passed" && "text-emerald-600",
                    status === "pending_approval" && "text-amber-600",
                    status === "pending_wait" && "text-amber-600",
                    status === "failed" && "text-destructive",
                    status === "running" && "text-primary",
                    status === "idle" && "text-muted-foreground"
                  )}
                >
                  {statusLabel(status)}
                </span>
              </div>
              {errorMessage ? (
                <span className="text-xs text-destructive">{errorMessage}</span>
              ) : null}
            </div>

            {pendingApproval ? (
              <div className="space-y-3 border-b bg-amber-500/5 px-4 py-3">
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium">
                    Paused at {pendingApproval.nodeLabel}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {pendingApproval.approverType === "manual"
                      ? "Manual approval required"
                      : pendingApproval.approverType === "role"
                        ? `Waiting for role: ${pendingApproval.approverTarget}`
                        : `Waiting for: ${pendingApproval.approverTarget}`}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={isRunning}
                    onClick={() => submitApproval("approved")}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isRunning}
                    onClick={() => submitApproval("rejected")}
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
              {steps.length === 0 ? (
                <p className="p-4 text-sm text-muted-foreground">
                  Configure your payload and run a test to see step-by-step input
                  and output.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Step</TableHead>
                      <TableHead>Node</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>I/O</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {steps
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
                        <TestStepRow key={step.log.id} step={step} />
                      ))}
                  </TableBody>
                </Table>
              )}
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  )
}
