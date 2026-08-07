/**
 * Build / refresh the global AI knowledge index (docs + catalog).
 *
 * Usage (from apps/portal):
 *   npm run ai:index
 *
 * Requires GOOGLE_GENERATIVE_AI_API_KEY and SUPABASE_SECRET_KEY /
 * NEXT_PUBLIC_SUPABASE_URL in the environment (or apps/portal/.env.local).
 *
 * Free-tier Gemini embedding quota is ~100 requests/minute. Each chunk
 * counts as one request, so this script uses small batches + delays and
 * resumes from content_hash so re-runs only embed what is missing.
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { setTimeout as sleep } from "node:timers/promises"

import { createClient } from "@supabase/supabase-js"
import { embedMany } from "ai"
import { google } from "@ai-sdk/google"

import { chunkMarkdownDocument, hashChunkContent } from "../lib/ai/chunking"
import { buildCatalogKnowledgeChunks } from "../lib/ai/catalog-knowledge"

const __dirname = dirname(fileURLToPath(import.meta.url))
const portalRoot = resolve(__dirname, "..")
const repoRoot = resolve(portalRoot, "../..")

function loadEnvFile(path: string) {
  if (!existsSync(path)) return
  const text = readFileSync(path, "utf8")
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const value = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

loadEnvFile(resolve(portalRoot, ".env.local"))
loadEnvFile(resolve(repoRoot, ".env"))

const EMBEDDING_DIMENSIONS = 1536
const DOC_SOURCES = [
  "docs/Workflow_Nodes_Reference.md",
  "docs/Workflow_Node_Port_Specification.md",
  "docs/Portal_Guide.md",
]

/** Free tier ~100 embed requests/min — keep batches small. */
const BATCH_SIZE = Math.max(
  1,
  Number.parseInt(process.env.AI_INDEX_BATCH_SIZE ?? "16", 10) || 16
)
/** Pause between batches so RPM stays under the free-tier ceiling. */
const DELAY_MS = Math.max(
  0,
  Number.parseInt(process.env.AI_INDEX_DELAY_MS ?? "65000", 10) || 65000
)

function formatEmbedding(vector: number[]) {
  return `[${vector.join(",")}]`
}

function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const candidate = error as {
    statusCode?: number
    message?: string
    lastError?: { statusCode?: number; message?: string }
    errors?: Array<{ statusCode?: number; message?: string }>
  }
  if (candidate.statusCode === 429) return true
  if (candidate.lastError?.statusCode === 429) return true
  if (candidate.errors?.some((entry) => entry.statusCode === 429)) return true
  const message = String(
    candidate.message ?? candidate.lastError?.message ?? ""
  )
  return /quota|rate.?limit|RESOURCE_EXHAUSTED|429/i.test(message)
}

function retryDelayMs(error: unknown): number {
  const message = String(
    (error as { message?: string; lastError?: { message?: string } })
      ?.lastError?.message ??
      (error as { message?: string })?.message ??
      ""
  )
  const match = /retry in ([0-9.]+)s/i.exec(message)
  if (match) {
    return Math.ceil(Number.parseFloat(match[1]) * 1000) + 2000
  }
  return DELAY_MS || 60_000
}

async function embedBatch(
  modelId: string,
  values: string[],
  attempt = 1
): Promise<number[][]> {
  try {
    const result = await embedMany({
      model: google.embedding(modelId),
      values,
      maxRetries: 0,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType: "RETRIEVAL_DOCUMENT",
        },
      },
    })
    return result.embeddings
  } catch (error) {
    if (!isRateLimitError(error) || attempt >= 6) {
      throw error
    }
    const waitMs = retryDelayMs(error)
    console.warn(
      `Rate limited (attempt ${attempt}/5). Waiting ${Math.ceil(waitMs / 1000)}s…`
    )
    await sleep(waitMs)
    return embedBatch(modelId, values, attempt + 1)
  }
}

async function main() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY

  if (!apiKey) {
    throw new Error("Missing GOOGLE_GENERATIVE_AI_API_KEY")
  }
  if (!supabaseUrl || !secretKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY")
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const drafts = [...buildCatalogKnowledgeChunks()]

  for (const relative of DOC_SOURCES) {
    const absolute = resolve(repoRoot, relative)
    if (!existsSync(absolute)) {
      console.warn(`Skipping missing doc: ${relative}`)
      continue
    }
    const markdown = readFileSync(absolute, "utf8")
    drafts.push(...chunkMarkdownDocument(relative, markdown))
  }

  const prepared = drafts.map((draft) => ({
    ...draft,
    content_hash: hashChunkContent(
      `${draft.source}|${draft.heading}|${draft.content}`
    ),
  }))

  const { data: existing, error: existingError } = await admin
    .from("ai_knowledge_chunks")
    .select("content_hash")

  if (existingError) {
    throw new Error(existingError.message)
  }

  const existingHashes = new Set(
    ((existing as Array<{ content_hash: string }> | null) ?? []).map(
      (row) => row.content_hash
    )
  )

  const toEmbed = prepared.filter((row) => !existingHashes.has(row.content_hash))
  console.log(
    `Knowledge chunks: ${prepared.length} total, ${toEmbed.length} new/changed (already indexed: ${existingHashes.size})`
  )
  console.log(
    `Batch size ${BATCH_SIZE}, delay ${DELAY_MS}ms between batches (override with AI_INDEX_BATCH_SIZE / AI_INDEX_DELAY_MS)`
  )

  if (toEmbed.length === 0) {
    console.log("Nothing to embed.")
    return
  }

  const modelId =
    process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-001"

  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    if (i > 0 && DELAY_MS > 0) {
      console.log(`Waiting ${Math.ceil(DELAY_MS / 1000)}s before next batch…`)
      await sleep(DELAY_MS)
    }

    const batch = toEmbed.slice(i, i + BATCH_SIZE)
    const embeddings = await embedBatch(
      modelId,
      batch.map((row) => row.content)
    )

    const rows = batch.map((row, index) => ({
      source: row.source,
      heading: row.heading,
      content: row.content,
      content_hash: row.content_hash,
      embedding: formatEmbedding(embeddings[index]),
      updated_at: new Date().toISOString(),
    }))

    const { error } = await admin.from("ai_knowledge_chunks").upsert(rows, {
      onConflict: "content_hash",
    })

    if (error) {
      throw new Error(error.message)
    }

    console.log(`Upserted ${i + batch.length}/${toEmbed.length}`)
  }

  console.log("Knowledge index build complete.")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
