"use client"

import * as React from "react"

import {
  resumePlaygroundValidation,
  runPlaygroundValidation,
} from "@/lib/engine/playground"
import type {
  ApprovalDecision,
  NodeExecutionState,
  PlaygroundContinuationState,
  PlaygroundLogEntry,
  PlaygroundPendingApproval,
  PlaygroundPendingWait,
  PlaygroundStep,
} from "@/lib/engine/types"
import type { Workflow, WorkflowNode } from "@/lib/domain/workflow"

export type ValidationStatus =
  | "idle"
  | "running"
  | "pending_approval"
  | "pending_wait"
  | "passed"
  | "failed"

const STEP_DELAY_MS = 550

function workflowSignature(workflow: Workflow) {
  return JSON.stringify({
    nodes: workflow.nodes,
    edges: workflow.edges ?? [],
  })
}

function highlightedNodeSignature(node: WorkflowNode) {
  return JSON.stringify({
    label: node.label,
    kind: node.kind,
    config: node.config,
    position: node.position,
  })
}

function buildNodeStatesFromStep(
  step: PlaygroundStep,
  previous: Record<string, NodeExecutionState>
): Record<string, NodeExecutionState> {
  if (!step.nodeId) {
    return previous
  }

  const next = { ...previous }

  switch (step.type) {
    case "node_enter":
    case "pending_approval":
    case "pending_wait":
      next[step.nodeId] = "running"
      break
    case "node_exit":
      if (next[step.nodeId] !== "error") {
        next[step.nodeId] = "completed"
      }
      break
    case "node_error":
      next[step.nodeId] = "error"
      break
    default:
      break
  }

  return next
}

async function playStepsFromIndex(
  steps: PlaygroundStep[],
  startIndex: number,
  runId: number,
  runIdRef: React.MutableRefObject<number>,
  onStep: (
    accumulatedLogs: PlaygroundLogEntry[],
    accumulatedSteps: PlaygroundStep[],
    states: Record<string, NodeExecutionState>,
    step: PlaygroundStep
  ) => void
) {
  let accumulatedStates: Record<string, NodeExecutionState> = {}
  let accumulatedLogs: PlaygroundLogEntry[] = []
  let accumulatedSteps: PlaygroundStep[] = startIndex > 0 ? steps.slice(0, startIndex) : []

  for (let index = startIndex; index < steps.length; index += 1) {
    const step = steps[index]

    if (runIdRef.current !== runId) {
      return null
    }

    accumulatedLogs = [...accumulatedLogs, step.log]
    accumulatedSteps = [...accumulatedSteps, step]
    accumulatedStates = buildNodeStatesFromStep(step, accumulatedStates)
    onStep(
      [...accumulatedLogs],
      [...accumulatedSteps],
      { ...accumulatedStates },
      step
    )

    await new Promise((resolve) => setTimeout(resolve, STEP_DELAY_MS))

    if (runIdRef.current !== runId) {
      return null
    }
  }

  return { accumulatedLogs, accumulatedSteps, accumulatedStates }
}

export function useWorkflowValidation(workflow: Workflow) {
  const [status, setStatus] = React.useState<ValidationStatus>("idle")
  const [logs, setLogs] = React.useState<PlaygroundLogEntry[]>([])
  const [steps, setSteps] = React.useState<PlaygroundStep[]>([])
  const [nodeStates, setNodeStates] = React.useState<
    Record<string, NodeExecutionState>
  >({})
  const [activeEdgeId, setActiveEdgeId] = React.useState<string | null>(null)
  const [validatedSignature, setValidatedSignature] = React.useState<
    string | null
  >(null)
  const [panelOpen, setPanelOpen] = React.useState(false)
  const [pendingApproval, setPendingApproval] =
    React.useState<PlaygroundPendingApproval | null>(null)
  const [continuation, setContinuation] =
    React.useState<PlaygroundContinuationState | null>(null)
  const [pendingWait, setPendingWait] =
    React.useState<PlaygroundPendingWait | null>(null)
  const runIdRef = React.useRef(0)
  const runSignatureRef = React.useRef<string | null>(null)
  const highlightedNodesSnapshotRef = React.useRef<Record<string, string>>({})
  const workflowRef = React.useRef(workflow)
  workflowRef.current = workflow

  const currentSignature = React.useMemo(
    () => workflowSignature(workflow),
    [workflow]
  )

  const isDeployable =
    status === "passed" && validatedSignature === currentSignature

  const handleStepUpdate = React.useCallback(
    (
      accumulatedLogs: PlaygroundLogEntry[],
      accumulatedSteps: PlaygroundStep[],
      accumulatedStates: Record<string, NodeExecutionState>,
      step: PlaygroundStep
    ) => {
      setLogs([...accumulatedLogs])
      setSteps([...accumulatedSteps])
      setNodeStates({ ...accumulatedStates })

      if (step.type === "edge_fire" && step.edgeId) {
        setActiveEdgeId(step.edgeId)
      } else if (
        step.type === "node_enter" ||
        step.type === "pending_approval" ||
        step.type === "pending_wait"
      ) {
        setActiveEdgeId(null)
      }
    },
    []
  )

  const cancelRunningValidation = React.useCallback(
    (message = "Validation cancelled — workflow changed.") => {
      runIdRef.current += 1
      runSignatureRef.current = null
      setStatus("idle")
      setValidatedSignature(null)
      setNodeStates({})
      setActiveEdgeId(null)
      setPendingApproval(null)
      setPendingWait(null)
      setContinuation(null)
      setLogs((previous) => [
        ...previous,
        {
          id: `log-cancel-${Date.now()}`,
          timestamp: Date.now(),
          message,
          level: "warning",
        },
      ])
    },
    []
  )

  React.useEffect(() => {
    const highlightedNodeIds = Object.keys(nodeStates)

    if (highlightedNodeIds.length === 0) {
      highlightedNodesSnapshotRef.current = {}
      return
    }

    const snapshot: Record<string, string> = {}
    for (const nodeId of highlightedNodeIds) {
      const node = workflowRef.current.nodes.find((entry) => entry.id === nodeId)
      if (node) {
        snapshot[nodeId] = highlightedNodeSignature(node)
      }
    }
    highlightedNodesSnapshotRef.current = snapshot
  }, [nodeStates])

  React.useEffect(() => {
    if (status === "running" || status === "pending_approval" || status === "pending_wait") {
      return
    }

    const highlightedNodeIds = Object.keys(nodeStates)
    if (highlightedNodeIds.length === 0) {
      return
    }

    const snapshot = highlightedNodesSnapshotRef.current
    const highlightedNodeWasModified = highlightedNodeIds.some((nodeId) => {
      const node = workflow.nodes.find((entry) => entry.id === nodeId)
      if (!node) {
        return true
      }

      const previous = snapshot[nodeId]
      if (!previous) {
        return false
      }

      return previous !== highlightedNodeSignature(node)
    })

    if (!highlightedNodeWasModified) {
      return
    }

    highlightedNodesSnapshotRef.current = {}
    setNodeStates({})
    setActiveEdgeId(null)
    setPendingApproval(null)
    setContinuation(null)

    if (status === "passed" || status === "failed") {
      setStatus("idle")
      setValidatedSignature(null)
    }
  }, [nodeStates, status, workflow.nodes])

  React.useEffect(() => {
    if (
      status === "running" &&
      runSignatureRef.current !== null &&
      runSignatureRef.current !== currentSignature
    ) {
      cancelRunningValidation()
      return
    }

    if (
      validatedSignature !== null &&
      validatedSignature !== currentSignature &&
      status === "passed"
    ) {
      setStatus("idle")
      setValidatedSignature(null)
      setNodeStates({})
      setActiveEdgeId(null)
      setPendingApproval(null)
      setPendingWait(null)
      setContinuation(null)
    }
  }, [cancelRunningValidation, currentSignature, status, validatedSignature])

  const resetVisualState = React.useCallback(() => {
    setNodeStates({})
    setActiveEdgeId(null)
    setLogs([])
    setSteps([])
    setPendingApproval(null)
    setPendingWait(null)
    setContinuation(null)
  }, [])

  const finalizeRun = React.useCallback(
    (
      runId: number,
      result: Awaited<ReturnType<typeof runPlaygroundValidation>>
    ) => {
      if (runIdRef.current !== runId) {
        return
      }

      if (result.pendingApproval && result.continuation) {
        runSignatureRef.current = currentSignature
        setStatus("pending_approval")
        setPendingApproval(result.pendingApproval)
        setPendingWait(null)
        setContinuation(result.continuation)
        setValidatedSignature(null)
        return
      }

      if (result.pendingWait && result.continuation) {
        runSignatureRef.current = currentSignature
        setStatus("pending_wait")
        setPendingWait(result.pendingWait)
        setPendingApproval(null)
        setContinuation(result.continuation)
        setValidatedSignature(null)
        return
      }

      runSignatureRef.current = null
      setActiveEdgeId(null)
      setPendingApproval(null)
      setPendingWait(null)
      setContinuation(null)

      if (result.passed) {
        setStatus("passed")
        setValidatedSignature(currentSignature)
      } else {
        setStatus("failed")
        setValidatedSignature(null)
      }
    },
    [currentSignature]
  )

  const runValidation = React.useCallback(async () => {
    const runId = ++runIdRef.current
    runSignatureRef.current = currentSignature

    resetVisualState()
    setStatus("running")
    setPanelOpen(true)

    const result = await runPlaygroundValidation(
      workflow.nodes,
      workflow.edges ?? [],
      { capturePayloads: true }
    )

    const played = await playStepsFromIndex(
      result.steps,
      0,
      runId,
      runIdRef,
      handleStepUpdate
    )

    if (!played) {
      return
    }

    finalizeRun(runId, result)
  }, [
    currentSignature,
    finalizeRun,
    handleStepUpdate,
    resetVisualState,
    workflow.edges,
    workflow.nodes,
  ])

  const submitApproval = React.useCallback(
    async (decision: ApprovalDecision) => {
      if (!continuation) {
        return
      }

      const runId = ++runIdRef.current
      setStatus("running")

      const result = await resumePlaygroundValidation(
        workflow.nodes,
        workflow.edges ?? [],
        continuation,
        { type: "approval", decision },
        { capturePayloads: true }
      )

      const played = await playStepsFromIndex(
        result.steps,
        continuation.steps.length,
        runId,
        runIdRef,
        handleStepUpdate
      )

      if (!played) {
        return
      }

      finalizeRun(runId, result)
    },
    [
      continuation,
      finalizeRun,
      handleStepUpdate,
      workflow.edges,
      workflow.nodes,
    ]
  )

  const resumeAfterWait = React.useCallback(async () => {
    if (!continuation) {
      return
    }

    const runId = ++runIdRef.current
    setStatus("running")

    const result = await resumePlaygroundValidation(
      workflow.nodes,
      workflow.edges ?? [],
      continuation,
      { type: "wait" },
      { capturePayloads: true }
    )

    const played = await playStepsFromIndex(
      result.steps,
      continuation.steps.length,
      runId,
      runIdRef,
      handleStepUpdate
    )

    if (!played) {
      return
    }

    finalizeRun(runId, result)
  }, [
    continuation,
    finalizeRun,
    handleStepUpdate,
    workflow.edges,
    workflow.nodes,
  ])

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

  const clearValidation = React.useCallback(() => {
    runIdRef.current += 1
    runSignatureRef.current = null
    setStatus("idle")
    setValidatedSignature(null)
    resetVisualState()
  }, [resetVisualState])

  return {
    status,
    logs,
    steps,
    nodeStates,
    activeEdgeId,
    isDeployable,
    panelOpen,
    setPanelOpen,
    runValidation,
    submitApproval,
    clearValidation,
    pendingApproval,
    pendingWait,
    isRunning: status === "running",
  }
}
