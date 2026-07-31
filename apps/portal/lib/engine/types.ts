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
  | "finish_pass"
  | "finish_fail"

export type PlaygroundStep = {
  type: PlaygroundStepType
  nodeId?: string
  edgeId?: string
  log: PlaygroundLogEntry
}

export type PlaygroundRunResult = {
  passed: boolean
  steps: PlaygroundStep[]
  errorMessage?: string
}
