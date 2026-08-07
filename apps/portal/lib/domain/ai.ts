import type { PlanTier } from "@/lib/domain/billing"

/** Single assistant mode — the model chooses how to respond. */
export type AiMode = "auto"

export type AiToolSafety = "read" | "additive" | "destructive" | "planning"

export type AiAssistantStatus =
  | "idle"
  | "listening"
  | "thinking"
  | "streaming"
  | "error"
  | "quota-exhausted"

/** @deprecated Use AiAssistantStatus */
export type AiOrbState = AiAssistantStatus

export type AiUsageKind = "chat" | "embedding"

/** Maximum saved assistant conversations per user. Oldest are removed when exceeded. */
export const MAX_ACTIVE_AI_THREADS = 10

/** Oldest thread ids to delete so count stays within the active limit. */
export function selectExcessThreadIds(
  orderedThreadIds: string[],
  maxThreads = MAX_ACTIVE_AI_THREADS,
  reserveSlots = 0
): string[] {
  const allowed = maxThreads - reserveSlots
  const excess = orderedThreadIds.length - allowed
  if (excess <= 0) return []
  return orderedThreadIds.slice(0, excess)
}

export type AiQuotaSnapshot = {
  plan: PlanTier
  periodStart: string
  usedTokens: number
  allowanceTokens: number
  remainingTokens: number
  usedCredits: number
  allowanceCredits: number
  remainingCredits: number
  exhausted: boolean
}

export type AiThreadSummary = {
  id: string
  title: string
  mode: AiMode
  updatedAt: string
  createdAt: string
}

export type AiStoredMessage = {
  id: string
  threadId: string
  role: "user" | "assistant" | "system" | "tool"
  content: string
  parts: unknown[]
  createdAt: string
}

export type ClarificationOption = {
  id: string
  label: string
}

export type ClarificationPrompt = {
  id: string
  question: string
  options?: ClarificationOption[]
}

export type BuildPlanStep = {
  id: string
  title: string
  detail: string
}

export type BuildPlanProposal = {
  id: string
  title: string
  summary: string
  steps: BuildPlanStep[]
  requiresApproval: true
}

export type DestructiveConfirmation = {
  requiresConfirmation: true
  confirmationId: string
  toolName: string
  summary: string
  payload: Record<string, unknown>
}

export function normalizeAiMode(_value?: unknown): AiMode {
  return "auto"
}
