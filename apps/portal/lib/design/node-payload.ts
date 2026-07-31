import type { WorkflowNode } from "@/lib/domain/workflow"

/** JSON object passed between nodes when a port fires. */
export type WorkflowPayload = Record<string, unknown>

/** Reference to a field on an upstream node's JSON output (stored in node config). */
export type UpstreamFieldRef = `${string}.${string}`

export function parseUpstreamFieldRef(value: unknown): {
  nodeId: string
  fieldName: string
} | null {
  if (typeof value !== "string" || !value.includes(".")) {
    return null
  }

  const [nodeId, ...rest] = value.split(".")
  const fieldName = rest.join(".")
  if (!nodeId || !fieldName) {
    return null
  }

  return { nodeId, fieldName }
}

/** Resolve an upstream field reference to a JSON path within the combined payload. */
export function upstreamFieldRefToJsonPath(value: unknown): string | null {
  const parsed = parseUpstreamFieldRef(value)
  if (!parsed) {
    return null
  }

  return parsed.fieldName
}

/** Read a value from a JSON payload using a simple field key. */
export function readPayloadField(payload: WorkflowPayload, fieldName: string) {
  return payload[fieldName]
}

/** Merge upstream JSON payload with transformed fields for the next node. */
export function forwardPayload(
  payload: WorkflowPayload,
  patch: WorkflowPayload = {}
): WorkflowPayload {
  return { ...payload, ...patch }
}

export function buildSamplePayloadForNode(node: WorkflowNode): WorkflowPayload {
  const outputFields = Array.isArray(node.config.outputFields)
    ? node.config.outputFields.filter((entry): entry is string => typeof entry === "string")
    : []

  if (outputFields.length > 0) {
    return Object.fromEntries(outputFields.map((field) => [field, null]))
  }

  return { payload: null }
}
