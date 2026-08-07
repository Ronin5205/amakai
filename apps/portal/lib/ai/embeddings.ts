import "server-only"

import { embed, embedMany } from "ai"

import {
  EMBEDDING_DIMENSIONS,
  getEmbeddingModel,
  getEmbeddingModelId,
  requireGeminiApiKey,
} from "@/lib/ai/models"
import { hashChunkContent } from "@/lib/ai/chunking"
import { recordAiUsage } from "@/lib/data/ai-usage"

export { hashChunkContent }

export async function embedTexts(
  values: string[],
  options?: { userId?: string; taskType?: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" }
): Promise<number[][]> {
  if (values.length === 0) {
    return []
  }

  requireGeminiApiKey()

  const result = await embedMany({
    model: getEmbeddingModel(),
    values,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: options?.taskType ?? "RETRIEVAL_DOCUMENT",
      },
    },
  })

  if (options?.userId) {
    const inputTokens = result.usage?.tokens ?? estimateTokens(values.join(" "))
    await recordAiUsage({
      userId: options.userId,
      kind: "embedding",
      model: getEmbeddingModelId(),
      inputTokens,
      outputTokens: 0,
    }).catch(() => {
      // Metering must not block retrieval.
    })
  }

  return result.embeddings
}

export async function embedQuery(
  value: string,
  options?: { userId?: string }
): Promise<number[]> {
  requireGeminiApiKey()

  const result = await embed({
    model: getEmbeddingModel(),
    value,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: "RETRIEVAL_QUERY",
      },
    },
  })

  if (options?.userId) {
    const inputTokens = result.usage?.tokens ?? estimateTokens(value)
    await recordAiUsage({
      userId: options.userId,
      kind: "embedding",
      model: getEmbeddingModelId(),
      inputTokens,
      outputTokens: 0,
    }).catch(() => {})
  }

  return result.embedding
}

export function estimateTokens(text: string): number {
  // Rough heuristic used only when the provider omits usage.
  return Math.max(1, Math.ceil(text.length / 4))
}

export function formatEmbeddingForPg(vector: number[]): string {
  return `[${vector.join(",")}]`
}
