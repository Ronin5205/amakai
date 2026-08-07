import type { SecretKind, SecretSummary } from "@/lib/domain/secret"
import { getComponentCatalogItemById } from "@/lib/design/component-catalog"
import { getCatalogItemId } from "@/lib/design/component-variant-definitions"
import { layoutNodesHorizontally } from "@/lib/design/layout-utils"
import {
  resolveInputPortId,
  resolveOutputPortId,
} from "@/lib/design/node-layout"
import {
  canonicalizeTriggerConfig,
  isIntegrationTrigger,
  isUnifiedTriggerCatalogId,
  normalizeTriggerMode,
} from "@/lib/design/trigger-config"
import { getIntegrationProvider } from "@/lib/integrations/registry"
import type { AiWorkflowGraphInput } from "@/lib/ai/graph-validation"
import type { WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import { asEditRows } from "@/lib/design/upstream-fields"

function integrationSecretKinds(
  service: string,
  provider: string
): SecretKind[] {
  const providerSpec = getIntegrationProvider(service, provider)
  return (providerSpec?.secretKinds ?? []) as SecretKind[]
}

function nodeNeedsIntegrationSecret(node: WorkflowNode): boolean {
  const catalogItemId = getCatalogItemId(node)
  if (
    isUnifiedTriggerCatalogId(catalogItemId) &&
    isIntegrationTrigger(node)
  ) {
    return true
  }
  if (catalogItemId === "integrations.external-tool") {
    return node.config.authMode !== "public" && node.config.authMode !== "none"
  }
  return false
}

function mergeCatalogDefaults(node: WorkflowNode): WorkflowNode {
  const catalogItemId = getCatalogItemId(node)
  const catalogItem = catalogItemId
    ? getComponentCatalogItemById(catalogItemId)
    : undefined
  const defaults = catalogItem?.defaultConfig ?? {}

  const config = { ...defaults, ...node.config }
  if (catalogItemId && isUnifiedTriggerCatalogId(catalogItemId)) {
    Object.assign(
      config,
      canonicalizeTriggerConfig(config, {
        label: node.label,
        catalogItemId,
      })
    )
  }

  return { ...node, config }
}

function normalizeEdgePorts(
  edge: WorkflowEdge,
  nodesById: Map<string, WorkflowNode>
): WorkflowEdge {
  const sourceNode = nodesById.get(edge.source)
  const targetNode = nodesById.get(edge.target)
  if (!sourceNode || !targetNode) {
    return edge
  }

  return {
    ...edge,
    sourcePort: resolveOutputPortId(sourceNode, edge.sourcePort),
    targetPort: resolveInputPortId(targetNode, edge.targetPort),
  }
}

/** Apply catalog defaults, layout, and edge port resolution before validation. */
export function enrichAiWorkflowGraph(
  graph: AiWorkflowGraphInput
): AiWorkflowGraphInput {
  const nodes = graph.nodes.map((rawNode) =>
    mergeCatalogDefaults(rawNode as WorkflowNode)
  ) as WorkflowNode[]

  const laidOut = layoutNodesHorizontally(
    nodes.map((node) => ({
      ...node,
      position: node.position ?? undefined,
    }))
  )

  const nodesById = new Map(laidOut.map((node) => [node.id, node]))
  const edges = (graph.edges as WorkflowEdge[]).map((edge) =>
    normalizeEdgePorts(edge, nodesById)
  )

  return { nodes: laidOut, edges }
}

export function applySecretDefaultsToGraph(
  graph: AiWorkflowGraphInput,
  secrets: SecretSummary[]
): { graph: AiWorkflowGraphInput; issues: string[] } {
  const issues: string[] = []

  const nodes = graph.nodes.map((rawNode) => {
    const node = { ...rawNode, config: { ...rawNode.config } } as WorkflowNode
    if (!nodeNeedsIntegrationSecret(node)) {
      return node
    }

    const service = String(node.config.service ?? "")
    const provider = String(node.config.provider ?? "")
    const kinds = integrationSecretKinds(service, provider)
    const matching = secrets.filter((secret) => kinds.includes(secret.kind))
    const current = String(node.config.secretName ?? "").trim()

    if (current) {
      const selected = secrets.find((secret) => secret.name === current)
      if (!selected || !kinds.includes(selected.kind)) {
        issues.push(
          `${node.label}: secret "${current}" is missing or not valid for ${service}/${provider}.`
        )
      }
      return node
    }

    if (matching.length === 1) {
      node.config.secretName = matching[0].name
      return node
    }

    if (matching.length === 0) {
      issues.push(
        `${node.label}: connect ${kinds.join(" or ")} in Resources → Secrets before using ${provider} ${service}.`
      )
      return node
    }

    issues.push(
      `${node.label}: set config.secretName to one of: ${matching.map((s) => s.name).join(", ")}.`
    )
    return node
  })

  return { graph: { ...graph, nodes }, issues }
}

export function validateAiBuildCompleteness(
  graph: AiWorkflowGraphInput,
  tables: Array<{ name: string }>
): string[] {
  const issues: string[] = []
  const tableNames = new Set(
    tables.map((table) => table.name.trim().toLowerCase())
  )

  for (const node of graph.nodes) {
    const catalogItemId = getCatalogItemId(node as WorkflowNode)
    const label = node.label.trim() || node.id

    if (catalogItemId === "action.edit-fields") {
      const rows = asEditRows(node.config.fieldEdits)
      const fieldCount = Number(node.config.fieldCount ?? rows.length)
      const effectiveRows = rows.slice(0, Math.max(1, fieldCount))
      const complete = effectiveRows.some(
        (row) => row.name.trim() && row.sourceField.trim()
      )
      if (!complete) {
        issues.push(
          `${label}: Edit Fields needs fieldEdits with output name and sourceField (nodeId.fieldName).`
        )
      }
    }

    if (catalogItemId === "action.data-table") {
      const operation = String(node.config.operation ?? "read")
      if (operation !== "write") {
        continue
      }

      const tableName = String(node.config.tableName ?? "").trim()
      if (!tableName) {
        issues.push(
          `${label}: Data Table write requires config.tableName from list_data_tables.`
        )
      } else if (!tableNames.has(tableName.toLowerCase())) {
        issues.push(
          `${label}: table "${tableName}" not found — create it or pick an existing table name.`
        )
      }

      const mappings = Array.isArray(node.config.columnMappings)
        ? node.config.columnMappings
        : []
      const hasMapping = mappings.some(
        (row) =>
          row &&
          typeof row === "object" &&
          String((row as { columnKey?: string }).columnKey ?? "").trim() &&
          String((row as { sourceField?: string }).sourceField ?? "").trim()
      )
      if (!hasMapping) {
        issues.push(
          `${label}: Data Table write needs columnMappings (columnKey + sourceField per column).`
        )
      }
    }

    if (isUnifiedTriggerCatalogId(catalogItemId)) {
      const mode = normalizeTriggerMode(node as WorkflowNode)
      if (
        mode === "integration" &&
        !String(node.config.secretName ?? "").trim()
      ) {
        issues.push(
          `${label}: email receive trigger requires config.secretName (oauth secret).`
        )
      }
    }
  }

  return issues
}
