export type NodeKind =
  | "sequential"
  | "parallel"
  | "conditional"
  | "loop"
  | "trigger"
  | "approval"
  | "exception"

export type PortType = "main" | "ai" | "error" | "branch" | string

export type NodePort = {
  id: string
  label: string
  type: PortType
  required?: boolean
  maxConnections?: number
}

export type ConfigFieldType =
  | "string"
  | "number"
  | "boolean"
  | "select"
  | "textarea"
  | "json"
  | "code"

export type ConfigSchemaField = {
  key: string
  label: string
  type: ConfigFieldType
  description?: string
  required?: boolean
  defaultValue?: unknown
  placeholder?: string
  options?: Array<{ label: string; value: string }>
}

export type NodeMetadata = {
  description?: string
  version?: string
  tags?: string[]
  documentationUrl?: string
  notes?: string
}

export type NodeProcessingMode = "builtin" | "custom-code" | "json-config"

export type NodeProcessing = {
  mode?: NodeProcessingMode
  customCode?: string
  jsonConfig?: Record<string, unknown>
}

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
  [key: string]: unknown
}

export type NodeDefinition = {
  kind: NodeKind
  label: string
  description: string
  inputs: NodePort[]
  outputs: NodePort[]
  configSchema: ConfigSchemaField[]
  metadataSchema?: ConfigSchemaField[]
  supportsCustomProcessing?: boolean
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
  metadata?: NodeMetadata
  processing?: NodeProcessing
}

export type WorkflowEdge = {
  id: string
  source: string
  target: string
  label?: string
  sourcePort?: string
  targetPort?: string
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
