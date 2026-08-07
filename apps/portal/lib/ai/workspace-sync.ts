import "server-only"

import type { DataTable } from "@/lib/domain/data-table"
import type { Workflow } from "@/lib/domain/workflow"
import { embedTexts } from "@/lib/ai/embeddings"
import {
  deleteWorkspaceChunksForSource,
  upsertWorkspaceChunks,
} from "@/lib/ai/retrieval"

function workflowChunkContent(workflow: Workflow): string {
  const nodeLines = workflow.nodes
    .map((node) => {
      const catalog =
        typeof node.config.catalogItemId === "string"
          ? ` catalog=${node.config.catalogItemId}`
          : ""
      return `- ${node.label} (${node.kind}${catalog})`
    })
    .join("\n")

  return [
    `Workflow: ${workflow.name}`,
    `Status: ${workflow.status ?? "draft"}`,
    `Nodes (${workflow.nodes.length}):`,
    nodeLines || "- (none)",
  ].join("\n")
}

function tableChunkContent(table: DataTable): string {
  const columns = table.columns
    .map((column) => `- ${column.key} (${column.type}): ${column.label}`)
    .join("\n")

  return [
    `Data table: ${table.name}`,
    table.description ? `Description: ${table.description}` : "",
    `Columns (${table.columns.length}):`,
    columns || "- (none)",
  ]
    .filter(Boolean)
    .join("\n")
}

/** Fire-and-forget safe: callers should not await in the request path. */
export async function syncWorkflowWorkspaceChunk(input: {
  userId: string
  workflow: Workflow
}): Promise<void> {
  if (!input.workflow.id || input.workflow.id.startsWith("draft-")) {
    return
  }

  const content = workflowChunkContent(input.workflow)
  const [embedding] = await embedTexts([content], {
    userId: input.userId,
    taskType: "RETRIEVAL_DOCUMENT",
  })

  await upsertWorkspaceChunks([
    {
      userId: input.userId,
      sourceKind: "workflow",
      sourceId: input.workflow.id,
      heading: input.workflow.name,
      content,
      embedding,
    },
  ])
}

export async function syncDataTableWorkspaceChunk(input: {
  userId: string
  table: DataTable
}): Promise<void> {
  const content = tableChunkContent(input.table)
  const [embedding] = await embedTexts([content], {
    userId: input.userId,
    taskType: "RETRIEVAL_DOCUMENT",
  })

  await upsertWorkspaceChunks([
    {
      userId: input.userId,
      sourceKind: "data_table",
      sourceId: input.table.id,
      heading: input.table.name,
      content,
      embedding,
    },
  ])
}

export async function removeWorkflowWorkspaceChunk(input: {
  userId: string
  workflowId: string
}): Promise<void> {
  await deleteWorkspaceChunksForSource({
    userId: input.userId,
    sourceKind: "workflow",
    sourceId: input.workflowId,
  })
}

export async function removeDataTableWorkspaceChunk(input: {
  userId: string
  tableId: string
}): Promise<void> {
  await deleteWorkspaceChunksForSource({
    userId: input.userId,
    sourceKind: "data_table",
    sourceId: input.tableId,
  })
}
