import { z } from "zod"

import type { Workflow, WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import type { WorkflowGraphDraft } from "@/lib/design/workflow-graph"
import { getComponentCatalogItemById } from "@/lib/design/component-catalog"
import { resolveNodeDefinition } from "@/lib/design/resolve-node-definition"
import { validateWorkflowDraft } from "@/lib/validation/workflow-node-config"

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

export function validateAiWorkflowGraph(
  input: unknown
): GraphValidationResult {
  const parsed = aiWorkflowGraphSchema.safeParse(input)
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

  const draftValidation = validateWorkflowDraft(draftWorkflow)
  if (!draftValidation.ok) {
    issues.push(draftValidation.error)
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
