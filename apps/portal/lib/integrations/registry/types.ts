import type {
  ConfigSchemaField,
  NodeKind,
  NodePort,
  WorkflowNode,
} from "@/lib/domain/workflow"
import type { SecretKind } from "@/lib/domain/secret"
import type { OutputFieldDef } from "@/lib/design/output-fields"

export type IntegrationAuthMode = "secret" | "public" | "none"

export type IntegrationServiceId = "email" | "api" | "webhook"

export type IntegrationProviderId =
  | "gmail"
  | "outlook"
  | "rest"
  | "webhook"

export type IntegrationOperationId =
  | "receive"
  | "send"
  | "request"
  | "emit"

export type IntegrationPayload = Record<string, unknown>

export type IntegrationConfigContext = {
  node: WorkflowNode
  nodeKind: NodeKind
  serviceId?: string
  providerId?: string
  operationId?: string
}

export type IntegrationExecuteContext = {
  node: WorkflowNode
  payload: IntegrationPayload
  mode: "playground" | "production"
  /** Optional resolved secret payload (production only). */
  secretPayload?: unknown
  secretMetadata?: Record<string, unknown>
}

export type IntegrationValidationResult =
  | { ok: true }
  | { ok: false; message: string }

export type IntegrationExecuteResult =
  | {
      ok: true
      payload: IntegrationPayload
      message?: string
      outputPort?: string
    }
  | { ok: false; message: string }

export type IntegrationOperation = {
  id: IntegrationOperationId
  label: string
  description: string
  /** Engine node kind this operation must run as. */
  nodeKind: "trigger" | "sequential"
  defaultOutputFields?: OutputFieldDef[]
  getConfigFields: (ctx: IntegrationConfigContext) => ConfigSchemaField[]
  resolvePorts?: (node: WorkflowNode) => {
    inputs: NodePort[]
    outputs: NodePort[]
  }
  validate: (config: Record<string, unknown>) => IntegrationValidationResult
  executePlayground: (
    ctx: IntegrationExecuteContext
  ) => IntegrationExecuteResult | Promise<IntegrationExecuteResult>
  executeProduction: (
    ctx: IntegrationExecuteContext
  ) => Promise<IntegrationExecuteResult>
}

export type IntegrationProvider = {
  id: IntegrationProviderId
  label: string
  description: string
  supportedAuth: Array<"oauth" | "api_key" | "none">
  secretKinds: SecretKind[]
  /** When true, authMode=public is rejected at deploy/production. */
  requireSecret?: boolean
  operations: IntegrationOperation[]
}

export type IntegrationService = {
  id: IntegrationServiceId
  label: string
  description: string
  providers: IntegrationProvider[]
}

export function readIntegrationSelection(config: Record<string, unknown>) {
  return {
    service: typeof config.service === "string" ? config.service : "",
    provider: typeof config.provider === "string" ? config.provider : "",
    operation: typeof config.operation === "string" ? config.operation : "",
    authMode:
      config.authMode === "public" || config.authMode === "none"
        ? config.authMode
        : ("secret" as const),
    secretName:
      typeof config.secretName === "string" ? config.secretName : "",
  }
}
