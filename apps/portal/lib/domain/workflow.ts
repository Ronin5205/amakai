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

export type WorkflowNode = {
  id: string
  label: string
  kind: NodeKind
  config: NodeConfig
}

export type Workflow = {
  id: string
  name: string
  nodes: WorkflowNode[]
  updatedAt: string
}
