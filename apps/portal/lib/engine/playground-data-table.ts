import type { TableColumnMapRow } from "@/lib/domain/data-table"
import {
  asEditRows,
  asRenameRows,
  asStringArray,
  asTableColumnMapRows,
} from "@/lib/design/upstream-fields"
import type { WorkflowNode } from "@/lib/domain/workflow"

export function resolvePayloadField(
  payload: unknown,
  sourceField: string
): unknown {
  if (!sourceField.trim()) {
    return undefined
  }

  const fieldName = sourceField.includes(".")
    ? sourceField.slice(sourceField.indexOf(".") + 1)
    : sourceField

  if (typeof payload !== "object" || payload === null) {
    return undefined
  }

  return (payload as Record<string, unknown>)[fieldName]
}

function playgroundSampleValue(fieldName: string, index = 0): unknown {
  const lower = fieldName.toLowerCase()

  if (lower.includes("email")) {
    return index > 0 ? `demo${index}@example.com` : "demo@example.com"
  }
  if (lower.includes("status")) {
    return "active"
  }
  if (lower === "name" || lower.endsWith("name")) {
    return index > 0 ? `Demo Contact ${index + 1}` : "Demo Contact"
  }
  if (lower.includes("amount") || lower.includes("score") || lower.includes("count")) {
    return 42
  }
  if (lower.includes("date") || lower.includes("at")) {
    return new Date().toISOString()
  }
  if (lower.includes("id")) {
    return `demo-${index + 1}`
  }
  if (lower.includes("priority")) {
    return "standard"
  }
  if (lower.includes("subject") || lower.includes("title")) {
    return "Sample subject"
  }
  if (lower.includes("body") || lower.includes("notes")) {
    return "Sample playground content"
  }

  return `sample_${fieldName}`
}

export function buildTriggerPlaygroundPayload(node: WorkflowNode) {
  const outputFields = asStringArray(node.config.outputFields)
  const samples = Object.fromEntries(
    outputFields.map((field, index) => [field, playgroundSampleValue(field, index)])
  )

  return mergePayload(
    { playground: true },
    {
      ...samples,
      triggeredAt: new Date().toISOString(),
      triggerType: String(node.config.triggerType ?? "manual"),
    }
  )
}

export function applyFieldEditsToPayload(
  payload: unknown,
  node: WorkflowNode
) {
  const edits = asEditRows(node.config.fieldEdits)
  const patch: Record<string, unknown> = {}

  for (const edit of edits) {
    const name = edit.name.trim()
    if (!name || !edit.sourceField.trim()) {
      continue
    }
    patch[name] = resolvePayloadField(payload, edit.sourceField)
  }

  return mergePayload(payload, patch)
}

export function applyRenamesToPayload(payload: unknown, node: WorkflowNode) {
  const renames = asRenameRows(node.config.renames)
  if (typeof payload !== "object" || payload === null) {
    return payload
  }

  const next = { ...(payload as Record<string, unknown>) }

  for (const rename of renames) {
    const fromField = rename.fromField.trim()
    const toField = rename.toField.trim()
    if (!fromField || !toField) {
      continue
    }

    const sourceFieldName = fromField.includes(".")
      ? fromField.slice(fromField.indexOf(".") + 1)
      : fromField

    if (sourceFieldName in next) {
      next[toField] = next[sourceFieldName]
      if (toField !== sourceFieldName) {
        delete next[sourceFieldName]
      }
    }
  }

  return next
}

export function buildDataTableRowFromPayload(
  payload: unknown,
  mappings: TableColumnMapRow[]
) {
  const rowData: Record<string, unknown> = {}

  for (const mapping of mappings) {
    if (!mapping.sourceField.trim()) {
      continue
    }
    const value = resolvePayloadField(payload, mapping.sourceField)
    if (value !== undefined) {
      rowData[mapping.columnKey] = value
    }
  }

  return rowData
}

export function countPopulatedRowFields(rowData: Record<string, unknown>) {
  return Object.values(rowData).filter(
    (value) => value !== undefined && value !== null && value !== ""
  ).length
}

export function mergePayload(
  payload: unknown,
  patch: Record<string, unknown>
) {
  const base =
    typeof payload === "object" && payload !== null
      ? (payload as Record<string, unknown>)
      : {}

  return { ...base, ...patch }
}

export function getDataTableOperation(node: WorkflowNode) {
  return node.config.operation === "write" ? "write" : "read"
}

export function getDataTableMappings(node: WorkflowNode) {
  return asTableColumnMapRows(node.config.columnMappings)
}
