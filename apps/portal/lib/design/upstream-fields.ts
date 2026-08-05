import { getCatalogItemId } from "@/lib/design/component-variant-definitions"
import {
  getEditFieldCount,
  normalizeFieldEditRows,
} from "@/lib/design/edit-fields"
import { parseOutputFieldDefs } from "@/lib/design/output-fields"
import { isUnifiedTriggerCatalogId } from "@/lib/design/trigger-config"
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

export type { SwitchCaseRule } from "@/lib/design/switch-rules"
export {
  buildDefaultSwitchCases,
  normalizeSwitchCases,
} from "@/lib/design/switch-rules"

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

  if (isUnifiedTriggerCatalogId(catalogItemId)) {
    const declared = parseOutputFieldDefs(node.config)
    if (declared.length > 0) {
      return declared.map((field) => field.name)
    }
    const legacy = asStringArray(node.config.outputFields)
    return legacy.length > 0 ? legacy : ["payload"]
  }

  if (catalogItemId === "loop.over-items") {
    return [...upstreamFields, "item", "loopItem", "loopIndex", "loopTotal"]
  }

  if (catalogItemId === "action.edit-fields") {
    const fieldCount = getEditFieldCount(node.config)
    const edits = normalizeFieldEditRows(node.config.fieldEdits, fieldCount)
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

  if (catalogItemId === "action.aggregate") {
    return [
      ...upstreamFields,
      "groups",
      "groupKeys",
      "groupCount",
      "itemCount",
      "aggregatedBy",
    ]
  }

  if (catalogItemId === "action.merge") {
    return [
      ...upstreamFields,
      "branchA",
      "branchB",
      "mergedAt",
      "mergeSourceCount",
    ]
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

function asTableColumnMapRows(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (entry): entry is { columnKey: string; sourceField: string } =>
      typeof entry === "object" &&
      entry !== null &&
      typeof (entry as { columnKey: string }).columnKey === "string" &&
      typeof (entry as { sourceField: string }).sourceField === "string"
  )
}

export {
  asEditRows,
  asRenameRows,
  asStringArray,
  asTableColumnMapRows,
}
