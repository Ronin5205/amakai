export type NodeKind =
  | "sequential"
  | "parallel"
  | "conditional"
  | "loop"
  | "trigger"
  | "approval"
  | "exception"

export type NodeConfig = {
  apiEndpoint?: string
  authMethod?: string
  retryCount?: number
  timeoutMs?: number
  rateLimit?: number
  aiModel?: string
  promptTemplate?: string
  inputMapping?: Record<string, string>
  outputMapping?: Record<string, string>
}

export type NodePosition = {
  x: number
  y: number
}

export type WorkflowNode = {
  id: string
  label: string
  kind: NodeKind
  config: NodeConfig
  position?: NodePosition
}

export type WorkflowEdge = {
  id: string
  source: string
  target: string
  label?: string
}

export type WorkflowStatus = "draft" | "published"

export type Workflow = {
  id: string
  name: string
  status?: WorkflowStatus
  nodes: WorkflowNode[]
  edges?: WorkflowEdge[]
  updatedAt: string
}
