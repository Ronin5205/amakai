import { google } from "@ai-sdk/google"

export const EMBEDDING_DIMENSIONS = 1536

export function getChatModelId() {
  return process.env.GEMINI_CHAT_MODEL?.trim() || "gemini-3.5-flash"
}

export function getEmbeddingModelId() {
  return process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-001"
}

export function getChatModel() {
  return google(getChatModelId())
}

export function getEmbeddingModel() {
  return google.embedding(getEmbeddingModelId())
}

export function requireGeminiApiKey() {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim()
  if (!key) {
    throw new Error(
      "Missing GOOGLE_GENERATIVE_AI_API_KEY. Add it to apps/portal/.env.local."
    )
  }
  return key
}
