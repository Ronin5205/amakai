import "server-only"

import {
  embedQuery,
  formatEmbeddingForPg,
  hashChunkContent,
} from "@/lib/ai/embeddings"
import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"

export type KnowledgeHit = {
  id: string
  source: string
  heading: string
  content: string
  similarity: number
}

export type WorkspaceHit = {
  id: string
  sourceKind: "workflow" | "data_table"
  sourceId: string
  heading: string
  content: string
  similarity: number
}

export async function searchProductKnowledge(
  query: string,
  options?: { matchCount?: number; userId?: string }
): Promise<KnowledgeHit[]> {
  const embedding = await embedQuery(query, { userId: options?.userId })
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("match_ai_knowledge", {
    query_embedding: formatEmbeddingForPg(embedding),
    match_count: options?.matchCount ?? 8,
  })

  if (error) {
    throw new Error(error.message ?? "Knowledge search failed.")
  }

  return ((data as Array<Record<string, unknown>>) ?? []).map((row) => ({
    id: String(row.id),
    source: String(row.source ?? ""),
    heading: String(row.heading ?? ""),
    content: String(row.content ?? ""),
    similarity: Number(row.similarity ?? 0),
  }))
}

export async function searchWorkspaceKnowledge(
  query: string,
  options?: { matchCount?: number; userId?: string }
): Promise<WorkspaceHit[]> {
  const embedding = await embedQuery(query, { userId: options?.userId })
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("match_ai_workspace", {
    query_embedding: formatEmbeddingForPg(embedding),
    match_count: options?.matchCount ?? 8,
  })

  if (error) {
    throw new Error(error.message ?? "Workspace search failed.")
  }

  return ((data as Array<Record<string, unknown>>) ?? []).map((row) => ({
    id: String(row.id),
    sourceKind:
      row.source_kind === "data_table" ? "data_table" : "workflow",
    sourceId: String(row.source_id),
    heading: String(row.heading ?? ""),
    content: String(row.content ?? ""),
    similarity: Number(row.similarity ?? 0),
  }))
}

export type WorkspaceChunkInput = {
  userId: string
  sourceKind: "workflow" | "data_table"
  sourceId: string
  heading: string
  content: string
  embedding: number[]
}

/** Replace all chunks for a source with the provided set (service role). */
export async function upsertWorkspaceChunks(
  chunks: WorkspaceChunkInput[]
): Promise<void> {
  if (chunks.length === 0) {
    return
  }

  const admin = createAdminClient()
  const userId = chunks[0].userId
  const sourceKind = chunks[0].sourceKind
  const sourceId = chunks[0].sourceId

  await admin
    .from("ai_workspace_chunks")
    .delete()
    .eq("user_id", userId)
    .eq("source_kind", sourceKind)
    .eq("source_id", sourceId)

  const rows = chunks.map((chunk) => ({
    user_id: chunk.userId,
    source_kind: chunk.sourceKind,
    source_id: chunk.sourceId,
    heading: chunk.heading,
    content: chunk.content,
    content_hash: hashChunkContent(
      `${chunk.sourceKind}:${chunk.sourceId}:${chunk.heading}:${chunk.content}`
    ),
    embedding: formatEmbeddingForPg(chunk.embedding),
    updated_at: new Date().toISOString(),
  }))

  const { error } = await admin.from("ai_workspace_chunks").insert(rows)
  if (error) {
    throw new Error(error.message ?? "Failed to upsert workspace chunks.")
  }
}

export async function deleteWorkspaceChunksForSource(input: {
  userId: string
  sourceKind: "workflow" | "data_table"
  sourceId: string
}): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from("ai_workspace_chunks")
    .delete()
    .eq("user_id", input.userId)
    .eq("source_kind", input.sourceKind)
    .eq("source_id", input.sourceId)
}
