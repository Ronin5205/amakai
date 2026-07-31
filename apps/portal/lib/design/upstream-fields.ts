import { getCatalogItemId } from "@/lib/design/component-variant-definitions"
import type { WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"

export type UpstreamFieldOption = {
  value: string
  label: string
  nodeId: string
  nodeLabel: string
  fieldName: string
}

export type FieldRenameRow = {
  fromField: string
  toField: string
}

export type FieldEditRow = {
  name: string
  sourceField: string
}

export type SwitchCaseRule = {
  portId: string
  label: string
  condition: string
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((entry): entry is string => typeof entry === "string")
}

function asRenameRows(value: unknown): FieldRenameRow[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (entry): entry is FieldRenameRow =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as FieldRenameRow).fromField === "string" &&
      typeof (entry as FieldRenameRow).toField === "string"
  )
}

function asEditRows(value: unknown): FieldEditRow[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (entry): entry is FieldEditRow =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as FieldEditRow).name === "string" &&
      typeof (entry as FieldEditRow).sourceField === "string"
  )
}

export function getImmediateUpstreamNodes(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  nodeId: string
) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  return edges
    .filter((edge) => edge.target === nodeId)
    .map((edge) => nodeById.get(edge.source))
    .filter((node): node is WorkflowNode => node !== undefined)
}

export function resolveNodeOutputFields(
  node: WorkflowNode,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  visited = new Set<string>()
): string[] {
  if (visited.has(node.id)) {
    return []
  }

  visited.add(node.id)

  const catalogItemId = getCatalogItemId(node)
  const upstream = getImmediateUpstreamNodes(nodes, edges, node.id)
  const upstreamFields = upstream.flatMap((source) =>
    resolveNodeOutputFields(source, nodes, edges, visited)
  )

  if (catalogItemId === "trigger.workflow") {
    const declared = asStringArray(node.config.outputFields)
    return declared.length > 0 ? declared : ["payload"]
  }

  if (catalogItemId === "action.edit-fields") {
    const edits = asEditRows(node.config.fieldEdits)
    const names = edits.map((row) => row.name.trim()).filter(Boolean)
    return names.length > 0 ? names : upstreamFields
  }

  if (catalogItemId === "action.rename-keys") {
    const renames = asRenameRows(node.config.renames)
    if (renames.length === 0) {
      return upstreamFields
    }

    const renamed = new Set(upstreamFields)
    for (const row of renames) {
      if (!row.fromField.trim()) {
        continue
      }
      renamed.delete(row.fromField.trim())
      if (row.toField.trim()) {
        renamed.add(row.toField.trim())
      }
    }

    return [...renamed]
  }

  if (catalogItemId === "condition.filter") {
    return upstreamFields
  }

  return upstreamFields
}

export function resolveUpstreamFieldOptions(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  nodeId: string
): UpstreamFieldOption[] {
  const upstreamNodes = getImmediateUpstreamNodes(nodes, edges, nodeId)

  return upstreamNodes.flatMap((upstreamNode) => {
    const fields = resolveNodeOutputFields(upstreamNode, nodes, edges)

    return fields.map((fieldName) => ({
      value: `${upstreamNode.id}.${fieldName}`,
      label: `${upstreamNode.label} → ${fieldName}`,
      nodeId: upstreamNode.id,
      nodeLabel: upstreamNode.label,
      fieldName,
    }))
  })
}

export function buildDefaultSwitchCases(caseCount: number, includeDefault: boolean) {
  const cases: SwitchCaseRule[] = Array.from({ length: caseCount }, (_, index) => {
    const caseNumber = index + 1
    return {
      portId: `case-${caseNumber}`,
      label: `Case ${caseNumber}`,
      condition: "",
    }
  })

  if (includeDefault) {
    cases.push({
      portId: "default",
      label: "Default",
      condition: "",
    })
  }

  return cases
}

export function normalizeSwitchCases(
  value: unknown,
  caseCount: number,
  includeDefault: boolean
): SwitchCaseRule[] {
  if (!Array.isArray(value)) {
    return buildDefaultSwitchCases(caseCount, includeDefault)
  }

  const parsed = value.filter(
    (entry): entry is SwitchCaseRule =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as SwitchCaseRule).portId === "string" &&
      typeof (entry as SwitchCaseRule).label === "string" &&
      typeof (entry as SwitchCaseRule).condition === "string"
  )

  const expected = buildDefaultSwitchCases(caseCount, includeDefault)
  return expected.map((rule) => {
    const existing = parsed.find((entry) => entry.portId === rule.portId)
    return existing ?? rule
  })
}

export {
  asEditRows,
  asRenameRows,
  asStringArray,
}
