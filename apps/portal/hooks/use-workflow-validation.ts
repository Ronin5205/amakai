"use client"

import * as React from "react"

import { runPlaygroundValidation } from "@/lib/engine/playground"
import type {
  NodeExecutionState,
  PlaygroundLogEntry,
  PlaygroundStep,
} from "@/lib/engine/types"
import type { Workflow, WorkflowNode } from "@/lib/domain/workflow"

export type ValidationStatus = "idle" | "running" | "passed" | "failed"

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

export function useWorkflowValidation(workflow: Workflow) {
  const [status, setStatus] = React.useState<ValidationStatus>("idle")
  const [logs, setLogs] = React.useState<PlaygroundLogEntry[]>([])
  const [nodeStates, setNodeStates] = React.useState<
    Record<string, NodeExecutionState>
  >({})
  const [activeEdgeId, setActiveEdgeId] = React.useState<string | null>(null)
  const [validatedSignature, setValidatedSignature] = React.useState<
    string | null
  >(null)
  const [panelOpen, setPanelOpen] = React.useState(false)
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

  const cancelRunningValidation = React.useCallback(
    (message = "Validation cancelled — workflow changed.") => {
      runIdRef.current += 1
      runSignatureRef.current = null
      setStatus("idle")
      setValidatedSignature(null)
      setNodeStates({})
      setActiveEdgeId(null)
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
    if (status === "running") {
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
    }
  }, [cancelRunningValidation, currentSignature, status, validatedSignature])

  const resetVisualState = React.useCallback(() => {
    setNodeStates({})
    setActiveEdgeId(null)
    setLogs([])
  }, [])

  const runValidation = React.useCallback(async () => {
    const runId = ++runIdRef.current
    runSignatureRef.current = currentSignature

    resetVisualState()
    setStatus("running")
    setPanelOpen(true)

    const result = runPlaygroundValidation(
      workflow.nodes,
      workflow.edges ?? []
    )

    let accumulatedStates: Record<string, NodeExecutionState> = {}
    let accumulatedLogs: PlaygroundLogEntry[] = []

    for (const step of result.steps) {
      if (runIdRef.current !== runId) {
        return
      }

      accumulatedLogs = [...accumulatedLogs, step.log]
      accumulatedStates = buildNodeStatesFromStep(step, accumulatedStates)

      setLogs([...accumulatedLogs])
      setNodeStates({ ...accumulatedStates })

      if (step.type === "edge_fire" && step.edgeId) {
        setActiveEdgeId(step.edgeId)
      } else if (step.type === "node_enter") {
        setActiveEdgeId(null)
      }

      await new Promise((resolve) => setTimeout(resolve, STEP_DELAY_MS))

      if (runIdRef.current !== runId) {
        return
      }
    }

    if (runIdRef.current !== runId) {
      return
    }

    runSignatureRef.current = null
    setActiveEdgeId(null)

    if (result.passed) {
      setStatus("passed")
      setValidatedSignature(currentSignature)
    } else {
      setStatus("failed")
      setValidatedSignature(null)
    }
  }, [currentSignature, resetVisualState, workflow.edges, workflow.nodes])

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
    nodeStates,
    activeEdgeId,
    isDeployable,
    panelOpen,
    setPanelOpen,
    runValidation,
    clearValidation,
    isRunning: status === "running",
  }
}
