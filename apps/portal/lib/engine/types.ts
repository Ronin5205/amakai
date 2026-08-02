export type PlaygroundLogLevel = "info" | "success" | "warning" | "error"

export type PlaygroundLogEntry = {
  id: string
  timestamp: number
  nodeId?: string
  nodeLabel?: string
  message: string
  level: PlaygroundLogLevel
}

export type NodeExecutionState = "idle" | "running" | "completed" | "error"

export type PlaygroundStepType =
  | "start"
  | "node_enter"
  | "node_exit"
  | "node_error"
  | "edge_fire"
  | "pending_approval"
  | "pending_wait"
  | "finish_pass"
  | "finish_fail"

export type PlaygroundStep = {
  type: PlaygroundStepType
  nodeId?: string
  edgeId?: string
  log: PlaygroundLogEntry
  /** Payload entering the node (testing mode). */
  inputPayload?: unknown
  /** Payload leaving the node (testing mode). */
  outputPayload?: unknown
}

export type ApprovalDecision = "approved" | "rejected"

export type PlaygroundQueueItem = {
  nodeId: string
  payload: unknown
  viaEdgeId?: string
  /** Present when this work unit is part of a Loop Over Items body. */
  loopContext?: { loopNodeId: string }
}

export type PlaygroundPendingApproval = {
  nodeId: string
  nodeLabel: string
  approverType: string
  approverTarget: string
  payload: unknown
}

export type PlaygroundPendingWait = {
  nodeId: string
  nodeLabel: string
  durationMs: number
  resumeAt: number
  payload: unknown
}

export type PlaygroundPendingState =
  | {
      kind: "approval"
      nodeId: string
      payload: unknown
      loopContext?: { loopNodeId: string }
    }
  | {
      kind: "wait"
      nodeId: string
      payload: unknown
      durationMs: number
      startedAt: number
      loopContext?: { loopNodeId: string }
    }

export type PlaygroundContinuationState = {
  steps: PlaygroundStep[]
  queue: PlaygroundQueueItem[]
  pending: PlaygroundPendingState
  /** Serialized loop-completion trackers so Done still fires after resume. */
  loopCompletions?: Record<
    string,
    { remaining: number; totalItems: number; donePayload: unknown }
  >
}

export type PlaygroundResumeAction =
  | { type: "approval"; decision: ApprovalDecision }
  | { type: "wait" }

export type PlaygroundRunOptions = {
  /** Custom trigger field values keyed by trigger node id. */
  triggerPayloads?: Record<string, Record<string, unknown>>
  /** Approval decisions keyed by approval node id (used when resuming). */
  approvalDecisions?: Record<string, ApprovalDecision>
  /** Wait nodes that have already elapsed and should resume immediately. */
  completedWaits?: Record<string, boolean>
  /** Capture input/output payloads on node steps. */
  capturePayloads?: boolean
}

export type PlaygroundRunResult = {
  passed: boolean
  steps: PlaygroundStep[]
  errorMessage?: string
  pendingApproval?: PlaygroundPendingApproval
  pendingWait?: PlaygroundPendingWait
  continuation?: PlaygroundContinuationState
}
