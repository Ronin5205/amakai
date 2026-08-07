import "server-only"

import type { AiQuotaSnapshot, AiUsageKind } from "@/lib/domain/ai"
import {
  billableTokens,
  buildQuotaSnapshot,
  currentAiPeriodStart,
} from "@/lib/ai/quota"
import { getUserPlan } from "@/lib/data/billing"
import { createAdminClient } from "@/utils/supabase/admin"
import { createClient } from "@/utils/supabase/server"

export class AiQuotaExhaustedError extends Error {
  readonly code = "ai_quota_exhausted" as const
  readonly quota: AiQuotaSnapshot

  constructor(quota: AiQuotaSnapshot) {
    super("AI credit allowance exhausted for this billing period.")
    this.name = "AiQuotaExhaustedError"
    this.quota = quota
  }
}

export async function getAiQuotaSnapshot(
  userId?: string
): Promise<AiQuotaSnapshot | null> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  const resolvedUserId = userId ?? user?.id
  if (error || !resolvedUserId) {
    return null
  }

  const plan = await getUserPlan()
  const periodStart = currentAiPeriodStart()

  const { data, error: usageError } = await supabase
    .from("ai_usage_monthly")
    .select("billable_tokens")
    .eq("user_id", resolvedUserId)
    .eq("period_start", periodStart)
    .maybeSingle()

  if (usageError) {
    throw new Error(usageError.message ?? "Failed to load AI usage.")
  }

  const usedTokens = Number(
    (data as { billable_tokens?: number | string } | null)?.billable_tokens ?? 0
  )

  return buildQuotaSnapshot({
    plan,
    usedTokens,
    periodStart,
  })
}

export async function assertAiQuota(userId: string): Promise<AiQuotaSnapshot> {
  const quota = await getAiQuotaSnapshot(userId)
  if (!quota) {
    throw new Error("Sign in to use the AI assistant.")
  }
  if (quota.exhausted) {
    throw new AiQuotaExhaustedError(quota)
  }
  return quota
}

export async function recordAiUsage(input: {
  userId: string
  kind: AiUsageKind
  model: string
  inputTokens: number
  outputTokens: number
  threadId?: string | null
}): Promise<number> {
  const admin = createAdminClient()
  const periodStart = currentAiPeriodStart()
  const billable = billableTokens({
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
  })

  if (billable === 0 && input.inputTokens === 0 && input.outputTokens === 0) {
    return 0
  }

  const { data, error } = await admin.rpc("increment_ai_usage_monthly", {
    p_user_id: input.userId,
    p_period_start: periodStart,
    p_billable_tokens: billable,
    p_kind: input.kind,
    p_model: input.model,
    p_input_tokens: Math.max(0, Math.floor(input.inputTokens)),
    p_output_tokens: Math.max(0, Math.floor(input.outputTokens)),
    p_thread_id: input.threadId ?? null,
  })

  if (error) {
    throw new Error(error.message ?? "Failed to record AI usage.")
  }

  return Number(data ?? 0)
}
