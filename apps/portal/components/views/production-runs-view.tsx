"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  CheckCircleIcon,
  CircleNotchIcon,
  RocketLaunchIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react"

import { startProductionRunAction } from "@/lib/actions/production-actions"
import { parseJsonFieldValue, parseJsonText } from "@/lib/design/json-value"
import { analyzeWorkflowTestRequirements } from "@/lib/engine/workflow-requirements"
import { StatusBadge } from "@/components/portal/status-badge"
import type { LiveWorkflowDetail } from "@/lib/domain/deployment"
import type { LiveWorkflow } from "@/lib/domain/deployment"
import type { ProductionRun } from "@/lib/domain/production"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@amakai/shared/components/ui/select"
import { Textarea } from "@amakai/shared/components/ui/textarea"

export interface ProductionRunsViewProps {
  manualWorkflows: LiveWorkflow[]
  workflowDetails: LiveWorkflowDetail[]
}

function buildTriggerPayloads(
  requirements: ReturnType<typeof analyzeWorkflowTestRequirements> | null,
  triggerValues: Record<string, Record<string, string>>,
  useCustomJson: boolean,
  customJsonPayload: string
) {
  if (useCustomJson) {
    const objectPayload = parseJsonText(customJsonPayload, {
      requireObject: true,
      label: "Custom payload",
    }) as Record<string, unknown>
    const triggerPayloads: Record<string, Record<string, unknown>> = {}

    if (requirements?.triggers.length === 1) {
      triggerPayloads[requirements.triggers[0].nodeId] = objectPayload
    } else if (requirements?.triggers.length) {
      for (const trigger of requirements.triggers) {
        triggerPayloads[trigger.nodeId] = objectPayload
      }
    }

    return triggerPayloads
  }

  if (!requirements?.triggers.length) {
    return undefined
  }

  const triggerPayloads: Record<string, Record<string, unknown>> = {}

  for (const trigger of requirements.triggers) {
    const values = triggerValues[trigger.nodeId] ?? {}
    triggerPayloads[trigger.nodeId] = Object.fromEntries(
      trigger.outputFields
        .map((field) => {
          const rawValue = values[field.name] ?? ""
          const parsed = parseJsonFieldValue(rawValue, field.type)
          return [field.name, parsed] as const
        })
        .filter(([, value]) => value !== undefined)
    )
  }

  return triggerPayloads
}

export function ProductionRunsView({
  manualWorkflows,
  workflowDetails,
}: ProductionRunsViewProps) {
  const router = useRouter()
  const [selectedWorkflowId, setSelectedWorkflowId] = React.useState(
    manualWorkflows[0]?.id ?? ""
  )
  const [isRunning, setIsRunning] = React.useState(false)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [lastRun, setLastRun] = React.useState<ProductionRun | null>(null)
  const [triggerValues, setTriggerValues] = React.useState<
    Record<string, Record<string, string>>
  >({})
  const [useCustomJson, setUseCustomJson] = React.useState(false)
  const [customJsonPayload, setCustomJsonPayload] = React.useState("{}")

  const selectedWorkflow = React.useMemo(
    () => workflowDetails.find((workflow) => workflow.id === selectedWorkflowId) ?? null,
    [selectedWorkflowId, workflowDetails]
  )

  const requirements = React.useMemo(
    () =>
      selectedWorkflow
        ? analyzeWorkflowTestRequirements({
            id: selectedWorkflow.id,
            name: selectedWorkflow.name,
            nodes: selectedWorkflow.nodes,
            edges: selectedWorkflow.edges,
            status: "published",
            updatedAt: selectedWorkflow.updatedAt,
          })
        : null,
    [selectedWorkflow]
  )

  React.useEffect(() => {
    if (!requirements) {
      setTriggerValues({})
      return
    }

    setTriggerValues((previous) => {
      const next: Record<string, Record<string, string>> = {}

      for (const trigger of requirements.triggers) {
        const existing = previous[trigger.nodeId] ?? {}
        next[trigger.nodeId] = Object.fromEntries(
          trigger.outputFields.map((field) => [
            field.name,
            existing[field.name] ?? "",
          ])
        )
      }

      return next
    })
  }, [requirements])

  const workflowItems = React.useMemo(
    () =>
      manualWorkflows.map((workflow) => ({
        value: workflow.id,
        label: workflow.name,
      })),
    [manualWorkflows]
  )

  const setTriggerFieldValue = React.useCallback(
    (triggerId: string, field: string, value: string) => {
      setTriggerValues((previous) => ({
        ...previous,
        [triggerId]: {
          ...(previous[triggerId] ?? {}),
          [field]: value,
        },
      }))
    },
    []
  )

  const handleRun = React.useCallback(async () => {
    if (!selectedWorkflowId) {
      return
    }

    setIsRunning(true)
    setErrorMessage(null)
    setLastRun(null)

    try {
      const triggerPayloads = buildTriggerPayloads(
        requirements,
        triggerValues,
        useCustomJson,
        customJsonPayload
      )

      const result = await startProductionRunAction(
        selectedWorkflowId,
        triggerPayloads
      )

      if ("error" in result) {
        setErrorMessage(result.error)
        return
      }

      setLastRun(result.run)
      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to start production run."
      )
    } finally {
      setIsRunning(false)
    }
  }, [
    customJsonPayload,
    requirements,
    router,
    selectedWorkflowId,
    triggerValues,
    useCustomJson,
  ])

  if (manualWorkflows.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RocketLaunchIcon />
          </EmptyMedia>
          <EmptyTitle>No manual workflows to run</EmptyTitle>
          <EmptyDescription>
            Only workflows with a manual trigger can be started here. Deploy a
            manual workflow from the editor to run it in production.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3 border p-4">
          <Label htmlFor="production-workflow-select">Manual workflow</Label>
          <Select
            items={workflowItems}
            value={selectedWorkflowId || null}
            onValueChange={(value) => {
              if (typeof value === "string") {
                setSelectedWorkflowId(value)
                setLastRun(null)
                setErrorMessage(null)
              }
            }}
          >
            <SelectTrigger id="production-workflow-select" className="w-full">
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
                Provide production trigger values before starting the run.
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
                placeholder='{"orderId": "ord-1"}'
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
                    {trigger.outputFields.map((field) => (
                      <div key={field.name} className="flex flex-col gap-2">
                        <Label htmlFor={`production-${trigger.nodeId}-${field.name}`}>
                          {field.name}
                        </Label>
                        {field.type === "object" ? (
                          <Textarea
                            id={`production-${trigger.nodeId}-${field.name}`}
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
                          />
                        ) : (
                          <Input
                            id={`production-${trigger.nodeId}-${field.name}`}
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
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <Button
          onClick={() => void handleRun()}
          disabled={isRunning || !selectedWorkflowId}
          className="w-full"
        >
          {isRunning ? (
            <CircleNotchIcon className="animate-spin" data-icon="inline-start" />
          ) : (
            <RocketLaunchIcon data-icon="inline-start" />
          )}
          Run in production
        </Button>
      </div>

      <div className="flex flex-col gap-4 border p-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">Run result</h2>
          <p className="text-xs text-muted-foreground">
            Production runs are recorded in history and appear under Operate for
            the selected workflow.
          </p>
        </div>

        {errorMessage ? (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <XCircleIcon className="mt-0.5 size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        ) : null}

        {!lastRun && !errorMessage ? (
          <p className="text-sm text-muted-foreground">
            Start a run to see status here.
          </p>
        ) : null}

        {lastRun ? (
          <div className="flex flex-col gap-3 rounded-md border p-4">
            <div className="flex items-center gap-2">
              {lastRun.status === "completed" ? (
                <CheckCircleIcon className="size-4 text-emerald-600" />
              ) : lastRun.status === "failed" ? (
                <XCircleIcon className="size-4 text-destructive" />
              ) : (
                <WarningCircleIcon className="size-4 text-amber-600" />
              )}
              <StatusBadge status={lastRun.status} />
            </div>
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Workflow</dt>
                <dd className="font-medium">{lastRun.workflowName}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Trigger</dt>
                <dd>{lastRun.trigger}</dd>
              </div>
              {lastRun.errorMessage ? (
                <div className="flex flex-col gap-1">
                  <dt className="text-muted-foreground">Error</dt>
                  <dd className="text-destructive">{lastRun.errorMessage}</dd>
                </div>
              ) : null}
            </dl>
            <Button variant="outline" render={<Link href="/production/history" />}>
              View in history
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
