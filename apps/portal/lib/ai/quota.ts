/** 1 credit = 1,000 billable tokens. */
export const TOKENS_PER_CREDIT = 1_000

/** Gemini output is weighted heavier than input for billing fairness. */
export const OUTPUT_WEIGHT = 4

/** Monthly token allowances by plan. */
export const AI_TOKEN_ALLOWANCE: Record<"free" | "pro", number> = {
  free: 2_000_000,
  pro: 10_000_000,
}

export function billableTokens(input: {
  inputTokens: number
  outputTokens: number
}): number {
  const inputTokens = Math.max(0, Math.floor(input.inputTokens))
  const outputTokens = Math.max(0, Math.floor(input.outputTokens))
  return inputTokens + OUTPUT_WEIGHT * outputTokens
}

export function tokensToCredits(tokens: number): number {
  return Math.max(0, tokens) / TOKENS_PER_CREDIT
}

export function creditsToTokens(credits: number): number {
  return Math.max(0, credits) * TOKENS_PER_CREDIT
}

export function allowanceForPlan(plan: "free" | "pro"): number {
  return AI_TOKEN_ALLOWANCE[plan]
}

/** UTC calendar-month period start (YYYY-MM-01). */
export function currentAiPeriodStart(now = new Date()): string {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}-01`
}

export function buildQuotaSnapshot(input: {
  plan: "free" | "pro"
  usedTokens: number
  periodStart?: string
}): {
  plan: "free" | "pro"
  periodStart: string
  usedTokens: number
  allowanceTokens: number
  remainingTokens: number
  usedCredits: number
  allowanceCredits: number
  remainingCredits: number
  exhausted: boolean
} {
  const allowanceTokens = allowanceForPlan(input.plan)
  const usedTokens = Math.max(0, Math.floor(input.usedTokens))
  const remainingTokens = Math.max(0, allowanceTokens - usedTokens)

  return {
    plan: input.plan,
    periodStart: input.periodStart ?? currentAiPeriodStart(),
    usedTokens,
    allowanceTokens,
    remainingTokens,
    usedCredits: tokensToCredits(usedTokens),
    allowanceCredits: tokensToCredits(allowanceTokens),
    remainingCredits: tokensToCredits(remainingTokens),
    exhausted: remainingTokens <= 0,
  }
}
