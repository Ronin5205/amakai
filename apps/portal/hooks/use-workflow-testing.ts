"use client"

import * as React from "react"

import {
  resumePlaygroundValidation,
  runPlaygroundValidation,
} from "@/lib/engine/playground"
import { parseJsonFieldValue, parseJsonText } from "@/lib/design/json-value"
import { analyzeWorkflowTestRequirements } from "@/lib/engine/workflow-requirements"
import type {
  ApprovalDecision,
  PlaygroundContinuationState,
  PlaygroundPendingApproval,
  PlaygroundPendingWait,
  PlaygroundStep,
} from "@/lib/engine/types"
import type { Workflow } from "@/lib/domain/workflow"

export type TestRunStatus =
  | "idle"
  | "running"
  | "pending_approval"
  | "pending_wait"
  | "passed"
  | "failed"

async function streamNewSteps(
  previousSteps: PlaygroundStep[],
  resultSteps: PlaygroundStep[],
  onSteps: (steps: PlaygroundStep[]) => void,
  delayMs = 0
) {
  const startIndex = previousSteps.length
  let accumulated = [...previousSteps]

  for (let index = startIndex; index < resultSteps.length; index += 1) {
    accumulated = [...accumulated, resultSteps[index]]
    onSteps([...accumulated])

    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

export function useWorkflowTesting(workflow: Workflow | null) {
  const [status, setStatus] = React.useState<TestRunStatus>("idle")
  const [steps, setSteps] = React.useState<PlaygroundStep[]>([])
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [pendingApproval, setPendingApproval] =
    React.useState<PlaygroundPendingApproval | null>(null)
  const [pendingWait, setPendingWait] =
    React.useState<PlaygroundPendingWait | null>(null)
  const [continuation, setContinuation] =
    React.useState<PlaygroundContinuationState | null>(null)
  const [triggerValues, setTriggerValues] = React.useState<
    Record<string, Record<string, string>>
  >({})
  const [useCustomJson, setUseCustomJson] = React.useState(false)
  const [customJsonPayload, setCustomJsonPayload] = React.useState("{}")

  const requirements = React.useMemo(
    () => (workflow ? analyzeWorkflowTestRequirements(workflow) : null),
    [workflow]
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

  const resetRun = React.useCallback(() => {
    setStatus("idle")
    setSteps([])
    setErrorMessage(null)
    setPendingApproval(null)
    setPendingWait(null)
    setContinuation(null)
  }, [])

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

  const buildTriggerPayloads = React.useCallback(() => {
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
  }, [customJsonPayload, requirements?.triggers, triggerValues, useCustomJson])

  const applyRunResult = React.useCallback(
    async (result: Awaited<ReturnType<typeof runPlaygroundValidation>>) => {
      await streamNewSteps(steps, result.steps, setSteps)

      if (result.pendingApproval && result.continuation) {
        setStatus("pending_approval")
        setPendingApproval(result.pendingApproval)
        setPendingWait(null)
        setContinuation(result.continuation)
        setErrorMessage(null)
        return
      }

      if (result.pendingWait && result.continuation) {
        setStatus("pending_wait")
        setPendingWait(result.pendingWait)
        setPendingApproval(null)
        setContinuation(result.continuation)
        setErrorMessage(null)
        return
      }

      setPendingApproval(null)
      setPendingWait(null)
      setContinuation(null)
      setErrorMessage(result.errorMessage ?? null)
      setStatus(result.passed ? "passed" : "failed")
    },
    [steps]
  )

  const runTest = React.useCallback(async () => {
    if (!workflow) {
      return
    }

    setStatus("running")
    setSteps([])
    setErrorMessage(null)
    setPendingApproval(null)
    setPendingWait(null)
    setContinuation(null)

    try {
      const triggerPayloads = buildTriggerPayloads()
      const result = await runPlaygroundValidation(
        workflow.nodes,
        workflow.edges ?? [],
        {
          triggerPayloads,
          capturePayloads: true,
        }
      )

      setSteps(result.steps)

      if (result.pendingApproval && result.continuation) {
        setStatus("pending_approval")
        setPendingApproval(result.pendingApproval)
        setContinuation(result.continuation)
        return
      }

      if (result.pendingWait && result.continuation) {
        setStatus("pending_wait")
        setPendingWait(result.pendingWait)
        setContinuation(result.continuation)
        return
      }

      setErrorMessage(result.errorMessage ?? null)
      setStatus(result.passed ? "passed" : "failed")
    } catch (error) {
      setStatus("failed")
      setErrorMessage(
        error instanceof Error ? error.message : "Invalid custom JSON payload."
      )
    }
  }, [buildTriggerPayloads, workflow])

  const submitApproval = React.useCallback(
    async (decision: ApprovalDecision) => {
      if (!workflow || !continuation) {
        return
      }

      setStatus("running")

      const result = await resumePlaygroundValidation(
        workflow.nodes,
        workflow.edges ?? [],
        continuation,
        { type: "approval", decision },
        {
          triggerPayloads: buildTriggerPayloads(),
          capturePayloads: true,
        }
      )

      await applyRunResult(result)
    },
    [applyRunResult, buildTriggerPayloads, continuation, workflow]
  )

  const resumeAfterWait = React.useCallback(async () => {
    if (!workflow || !continuation) {
      return
    }

    setStatus("running")

    const result = await resumePlaygroundValidation(
      workflow.nodes,
      workflow.edges ?? [],
      continuation,
      { type: "wait" },
      {
        triggerPayloads: buildTriggerPayloads(),
        capturePayloads: true,
      }
    )

    await applyRunResult(result)
  }, [applyRunResult, buildTriggerPayloads, continuation, workflow])

  React.useEffect(() => {
    if (status !== "pending_wait" || !pendingWait) {
      return
    }

    const remaining = pendingWait.resumeAt - Date.now()
    const timer = window.setTimeout(() => {
      void resumeAfterWait()
    }, Math.max(0, remaining))

    return () => window.clearTimeout(timer)
  }, [pendingWait, resumeAfterWait, status])

  return {
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
    resumeAfterWait,
    resetRun,
    isRunning: status === "running",
  }
}
