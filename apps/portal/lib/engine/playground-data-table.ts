import type { TableColumnMapRow } from "@/lib/domain/data-table"
import {
  ensureJsonObject,
  resolvePayloadField as resolveJsonPayloadField,
} from "@/lib/design/json-value"
import {
  coerceCompareValue,
  isComparisonOperator,
  matchesComparison,
  type ComparisonOperator,
} from "@/lib/design/comparison-rules"
import {
  type OutputFieldType,
} from "@/lib/design/output-fields"
import {
  normalizeTriggerMode,
  resolveTriggerOutputFields,
} from "@/lib/design/trigger-config"
import {
  asEditRows,
  asRenameRows,
  asStringArray,
  asTableColumnMapRows,
  type FieldEditRow,
} from "@/lib/design/upstream-fields"
import type { WorkflowNode } from "@/lib/domain/workflow"

export function resolvePayloadField(
  payload: unknown,
  sourceField: string
): unknown {
  return resolveJsonPayloadField(payload, sourceField)
}

function playgroundSampleArrayValue(fieldName: string): unknown[] {
  const lower = fieldName.toLowerCase()

  if (lower.includes("order")) {
    return [
      { orderId: "ord-1", amount: 120, status: "pending" },
      { orderId: "ord-2", amount: 85, status: "pending" },
    ]
  }

  if (
    lower.includes("item") ||
    lower.includes("row") ||
    lower.includes("record") ||
    lower.includes("entry")
  ) {
    return [
      { id: "item-1", name: "Item 1" },
      { id: "item-2", name: "Item 2" },
    ]
  }

  return [
    { id: `${fieldName}-1`, value: "sample 1" },
    { id: `${fieldName}-2`, value: "sample 2" },
  ]
}

function playgroundSampleObjectValue(fieldName: string): Record<string, unknown> {
  return {
    id: `demo-${fieldName}`,
    value: `sample_${fieldName}`,
  }
}

function playgroundSampleValue(
  fieldName: string,
  index = 0,
  fieldType: OutputFieldType = "string"
): unknown {
  if (fieldType === "array") {
    return playgroundSampleArrayValue(fieldName)
  }

  if (fieldType === "object") {
    return playgroundSampleObjectValue(fieldName)
  }

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

export function buildTriggerPayloadFromValues(
  node: WorkflowNode,
  values: Record<string, unknown> = {},
  options?: { fillMissingWithSamples?: boolean }
) {
  const fieldDefs = resolveTriggerOutputFields(node)
  const outputFields =
    fieldDefs.length > 0
      ? fieldDefs
      : asStringArray(node.config.outputFields).map((name) => ({
          name,
          type: "string" as const,
        }))

  const fieldValues = Object.fromEntries(
    outputFields.map((field, index) => {
      if (field.name in values) {
        return [field.name, values[field.name]]
      }
      if (options?.fillMissingWithSamples) {
        return [field.name, playgroundSampleValue(field.name, index, field.type)]
      }
      return [field.name, undefined]
    })
  )

  const resolved = Object.fromEntries(
    Object.entries(fieldValues).filter(([, value]) => value !== undefined)
  )

  return mergePayload(
    { playground: true },
    {
      ...resolved,
      triggeredAt: new Date().toISOString(),
      triggerType: normalizeTriggerMode(node),
    }
  )
}

export function buildTriggerPlaygroundPayload(node: WorkflowNode) {
  return buildTriggerPayloadFromValues(node, {}, { fillMissingWithSamples: true })
}

export function applySingleFieldEdit(payload: unknown, row: FieldEditRow) {
  const name = row.name.trim()
  if (!name || !row.sourceField.trim()) {
    return payload
  }

  return mergePayload(payload, {
    [name]: resolvePayloadField(payload, row.sourceField),
  })
}

export function applyFieldEditsToPayload(
  payload: unknown,
  node: WorkflowNode
) {
  const edits = asEditRows(node.config.fieldEdits)
  let next = payload

  for (const edit of edits) {
    next = applySingleFieldEdit(next, edit)
  }

  return next
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
  return { ...ensureJsonObject(payload), ...patch }
}

export function getDataTableOperation(node: WorkflowNode) {
  return node.config.operation === "write" ? "write" : "read"
}

export function getDataTableWriteMode(node: WorkflowNode) {
  return node.config.writeMode === "upsert" ? "upsert" : "insert"
}

export function isDataTableFindEnabled(node: WorkflowNode) {
  return node.config.enableFind === true
}

export function resolveFindCompareValue(
  payload: unknown,
  findValue: unknown,
  findValueField: unknown
) {
  const fieldRef = typeof findValueField === "string" ? findValueField.trim() : ""
  if (fieldRef) {
    const resolved = resolvePayloadField(payload, fieldRef)
    if (resolved !== undefined) {
      return resolved
    }
  }

  if (typeof findValue === "string") {
    return coerceCompareValue(findValue)
  }

  return undefined
}

export function filterDataTableRowsByColumn<T extends { data: Record<string, unknown> }>(
  rows: T[],
  columnKey: string,
  operator: unknown,
  compareValue: unknown
): T[] {
  const column = columnKey.trim()
  if (!column || compareValue === undefined) {
    return rows
  }

  const resolvedOperator: ComparisonOperator = isComparisonOperator(operator)
    ? operator
    : "equals"

  return rows.filter((row) =>
    matchesComparison(row.data[column], resolvedOperator, compareValue)
  )
}

export function findDataTableRowByColumnValue(
  rows: Array<{ id: string; data: Record<string, unknown> }>,
  columnKey: string,
  value: unknown
) {
  const column = columnKey.trim()
  if (!column || value === undefined) {
    return undefined
  }

  return rows.find((row) =>
    matchesComparison(row.data[column], "equals", value)
  )
}

export function getDataTableMappings(node: WorkflowNode) {
  return asTableColumnMapRows(node.config.columnMappings)
}
