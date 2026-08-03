import type { NodePort, WorkflowNode } from "@/lib/domain/workflow"
import { asEditRows, type FieldEditRow } from "@/lib/design/upstream-fields"

export const MAX_EDIT_FIELD_COUNT = 12

export function getEditFieldCount(config: Record<string, unknown>) {
  const fromCount = Number(config.fieldCount)
  if (Number.isFinite(fromCount) && fromCount >= 1) {
    return Math.min(MAX_EDIT_FIELD_COUNT, Math.max(1, Math.floor(fromCount)))
  }

  const edits = asEditRows(config.fieldEdits)
  return Math.max(1, Math.min(MAX_EDIT_FIELD_COUNT, edits.length || 1))
}

export function normalizeFieldEditRows(
  value: unknown,
  count = 1
): FieldEditRow[] {
  const parsed = asEditRows(value)
  const fieldCount = Math.min(
    MAX_EDIT_FIELD_COUNT,
    Math.max(1, Math.floor(count))
  )

  return Array.from({ length: fieldCount }, (_, index) => {
    const existing = parsed[index]
    return {
      name: existing?.name ?? "",
      sourceField: existing?.sourceField ?? "",
    }
  })
}

function inputPort(
  id: string,
  label: string,
  description: string,
  required = false
): NodePort {
  return { id, label, type: "main", required, description }
}

function outputPort(id: string, label: string, description: string): NodePort {
  return { id, label, type: "main", description }
}

export function buildEditFieldPorts(node: WorkflowNode) {
  const fieldCount = getEditFieldCount(node.config)
  const rows = normalizeFieldEditRows(node.config.fieldEdits, fieldCount)

  const inputs = rows.map((row, index) => {
    const slot = index + 1
    const outputName = row.name.trim()

    return inputPort(
      `input-${slot}`,
      outputName ? `${outputName} (source)` : `Input ${slot}`,
      row.sourceField.trim()
        ? `Reads "${row.sourceField}" from the incoming payload.`
        : `Source mapping for output ${slot}.`,
      index === 0
    )
  })

  const outputs = rows.map((row, index) => {
    const slot = index + 1
    const outputName = row.name.trim()

    return outputPort(
      `output-${slot}`,
      outputName || `Output ${slot}`,
      outputName
        ? `Emits the edited "${outputName}" value.`
        : `Edited output ${slot}.`
    )
  })

  return { inputs, outputs }
}

export function getEditFieldOutputPortId(
  node: WorkflowNode,
  index: number
) {
  return `output-${index + 1}`
}

export function validateFieldEditRows(node: WorkflowNode) {
  const fieldCount = getEditFieldCount(node.config)
  const rows = normalizeFieldEditRows(node.config.fieldEdits, fieldCount)
  const incomplete = rows.find(
    (row) => !row.name.trim() || !row.sourceField.trim()
  )

  if (incomplete) {
    return {
      ok: false as const,
      message: "Edit Fields requires an output name and source field for each row",
    }
  }

  return { ok: true as const, rows, fieldCount }
}
