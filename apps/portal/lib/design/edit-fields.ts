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

/**
 * Edit Fields is a sequential shaper: one payload in, one payload out.
 * Field mappings live in config (fieldEdits), not as per-row ports —
 * per-row ports previously broke Gmail → edit → table chains by fan-out
 * of partial payloads.
 */
export function buildEditFieldPorts(_node: WorkflowNode): {
  inputs: NodePort[]
  outputs: NodePort[]
} {
  return {
    inputs: [
      {
        id: "main-in",
        label: "Input",
        type: "main",
        required: true,
        description: "Incoming payload. Map fields via config.fieldEdits.",
      },
    ],
    outputs: [
      {
        id: "main-out",
        label: "Output",
        type: "main",
        description: "Payload with all mapped fields applied.",
      },
    ],
  }
}

/** @deprecated Prefer main-out; kept for legacy edge remapping. */
export function getEditFieldOutputPortId(
  _node: WorkflowNode,
  _index: number
) {
  return "main-out"
}

/** Remap legacy per-row ports (input-1 / output-2) onto the single sequential ports. */
export function normalizeEditFieldsPortId(
  side: "input" | "output",
  portId?: string
): string {
  if (!portId || portId === "main-in" || portId === "main-out") {
    return side === "input" ? "main-in" : "main-out"
  }
  if (/^input-\d+$/i.test(portId)) {
    return "main-in"
  }
  if (/^output-\d+$/i.test(portId)) {
    return "main-out"
  }
  return portId
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
