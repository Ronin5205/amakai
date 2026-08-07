import { z } from "zod"

import type { Workflow, WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import type { WorkflowGraphDraft } from "@/lib/design/workflow-graph"
import { getComponentCatalogItemById } from "@/lib/design/component-catalog"
import { resolveNodeDefinition } from "@/lib/design/resolve-node-definition"
import {
  canonicalizeTriggerConfig,
  isUnifiedTriggerCatalogId,
  normalizeTriggerMode,
} from "@/lib/design/trigger-config"
import {
  validateNodeConfigForRun,
} from "@/lib/validation/workflow-node-config"
import { resourceNameSchema } from "@/lib/validation/resource-names"
import { formatZodError } from "@/lib/validation/zod-helpers"

const nodeKindSchema = z.enum([
  "sequential",
  "parallel",
  "conditional",
  "loop",
  "trigger",
  "approval",
  "exception",
])

export const aiWorkflowNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(80),
  kind: nodeKindSchema,
  config: z.record(z.string(), z.unknown()).default({}),
  position: z
    .object({
      x: z.number(),
      y: z.number(),
    })
    .optional(),
})

export const aiWorkflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional(),
  sourcePort: z.string().optional(),
  targetPort: z.string().optional(),
})

export const aiWorkflowGraphSchema = z.object({
  nodes: z.array(aiWorkflowNodeSchema).min(1),
  edges: z.array(aiWorkflowEdgeSchema).default([]),
})

export type AiWorkflowGraphInput = z.infer<typeof aiWorkflowGraphSchema>

export type GraphValidationResult =
  | { ok: true; graph: WorkflowGraphDraft }
  | { ok: false; error: string; issues: string[] }

const NODE_KIND_ALIASES: Record<string, WorkflowNode["kind"]> = {
  action: "sequential",
}

function normalizeNodeInput(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") {
    return raw
  }

  const node = { ...(raw as Record<string, unknown>) }
  const config: Record<string, unknown> =
    typeof node.config === "object" && node.config !== null
      ? { ...(node.config as Record<string, unknown>) }
      : {}

  if (!config.catalogItemId && typeof node.catalogItemId === "string") {
    config.catalogItemId = node.catalogItemId
  }
  if (!config.catalogItemId && typeof node.componentVariant === "string") {
    config.catalogItemId = node.componentVariant
  }

  let kind =
    typeof node.kind === "string" ? (node.kind as WorkflowNode["kind"]) : node.kind
  if (typeof kind === "string" && NODE_KIND_ALIASES[kind]) {
    kind = NODE_KIND_ALIASES[kind]
  }

  const catalogItemId =
    typeof config.catalogItemId === "string" ? config.catalogItemId : undefined
  const catalogItem = catalogItemId
    ? getComponentCatalogItemById(catalogItemId)
    : undefined

  if (catalogItem && typeof kind === "string" && catalogItem.kind !== kind) {
    kind = catalogItem.kind
  }

  if (catalogItemId && isUnifiedTriggerCatalogId(catalogItemId)) {
    Object.assign(
      config,
      canonicalizeTriggerConfig(config, {
        label: String(node.label ?? ""),
        catalogItemId,
      })
    )
    kind = "trigger"
  }

  delete node.catalogItemId
  delete node.componentVariant
  node.config = config
  if (typeof kind === "string") {
    node.kind = kind
  }

  return node
}

/** Fix common AI graph mistakes before schema/product validation. */
export function normalizeAiWorkflowGraphInput(input: unknown): unknown {
  if (!input || typeof input !== "object") {
    return input
  }

  const graph = input as Record<string, unknown>
  return {
    ...graph,
    nodes: Array.isArray(graph.nodes)
      ? graph.nodes.map(normalizeNodeInput)
      : graph.nodes,
    edges: Array.isArray(graph.edges) ? graph.edges : [],
  }
}

export function validateAiWorkflowGraph(
  input: unknown
): GraphValidationResult {
  const normalized = normalizeAiWorkflowGraphInput(input)
  const parsed = aiWorkflowGraphSchema.safeParse(normalized)
  if (!parsed.success) {
    return {
      ok: false,
      error: "Generated workflow graph failed schema validation.",
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`
      ),
    }
  }

  const issues: string[] = []
  const nodeIds = new Set(parsed.data.nodes.map((node) => node.id))

  for (const node of parsed.data.nodes) {
    const catalogItemId =
      typeof node.config.catalogItemId === "string"
        ? node.config.catalogItemId
        : undefined

    if (catalogItemId) {
      const catalogItem = getComponentCatalogItemById(catalogItemId)
      if (!catalogItem) {
        issues.push(
          `Unknown catalogItemId "${catalogItemId}" on node "${node.id}".`
        )
        continue
      }
      if (catalogItem.kind !== node.kind) {
        issues.push(
          `Node "${node.id}" kind "${node.kind}" does not match catalog item "${catalogItemId}" kind "${catalogItem.kind}".`
        )
      }
    }

    try {
      resolveNodeDefinition({
        id: node.id,
        label: node.label,
        kind: node.kind,
        config: node.config,
        position: node.position,
      } as WorkflowNode)
    } catch (error) {
      issues.push(
        error instanceof Error
          ? error.message
          : `Failed to resolve node definition for "${node.id}".`
      )
    }
  }

  for (const edge of parsed.data.edges) {
    if (!nodeIds.has(edge.source)) {
      issues.push(`Edge "${edge.id}" references missing source "${edge.source}".`)
    }
    if (!nodeIds.has(edge.target)) {
      issues.push(`Edge "${edge.id}" references missing target "${edge.target}".`)
    }
  }

  const draftWorkflow: Workflow = {
    id: "ai-draft",
    name: "AI draft",
    nodes: parsed.data.nodes as WorkflowNode[],
    edges: parsed.data.edges as WorkflowEdge[],
    updatedAt: new Date().toISOString(),
  }

  const nameResult = resourceNameSchema.safeParse(draftWorkflow.name)
  if (!nameResult.success) {
    issues.push(formatZodError(nameResult.error))
  }

  for (const node of draftWorkflow.nodes) {
    const runCheck = validateNodeConfigForRun(node)
    if (!runCheck.ok) {
      issues.push(runCheck.error)
    }
  }

  for (const node of parsed.data.nodes) {
    const catalogItemId =
      typeof node.config.catalogItemId === "string"
        ? node.config.catalogItemId
        : undefined
    if (
      isUnifiedTriggerCatalogId(catalogItemId) &&
      normalizeTriggerMode(node as WorkflowNode) === "manual" &&
      /\b(gmail|outlook|inbox|email)\b/i.test(node.label)
    ) {
      issues.push(
        `${node.label}: email/Gmail inbox triggers must use triggerMode integration (Gmail/Outlook receive), not manual.`
      )
    }
  }

  if (issues.length > 0) {
    return {
      ok: false,
      error: "Generated workflow graph failed product validation.",
      issues,
    }
  }

  return {
    ok: true,
    graph: {
      nodes: parsed.data.nodes as WorkflowNode[],
      edges: parsed.data.edges as WorkflowEdge[],
    },
  }
}

const MAX_REPAIR_ATTEMPTS = 2

/**
 * Validate a graph; if invalid, invoke `repair` with the issues up to
 * MAX_REPAIR_ATTEMPTS times before failing.
 */
export async function validateAiWorkflowGraphWithRepair(
  initial: unknown,
  repair: (previous: unknown, issues: string[]) => Promise<unknown>
): Promise<GraphValidationResult> {
  let candidate = initial
  let last: GraphValidationResult = validateAiWorkflowGraph(candidate)

  for (let attempt = 0; attempt <= MAX_REPAIR_ATTEMPTS; attempt += 1) {
    last = validateAiWorkflowGraph(candidate)
    if (last.ok) {
      return last
    }
    if (attempt === MAX_REPAIR_ATTEMPTS) {
      break
    }
    candidate = await repair(candidate, last.issues)
  }

  return last
}

export { MAX_REPAIR_ATTEMPTS }
