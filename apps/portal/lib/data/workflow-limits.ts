import { createClient } from "@/utils/supabase/server"
import { workflowLimitForPlan } from "@/lib/data/plan-limits"
import type { PlanTier } from "@/lib/domain/billing"

export type WorkflowLimitState = {
  count: number
  limit: number
  canCreate: boolean
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export function buildWorkflowLimitState(
  count: number,
  limit: number
): WorkflowLimitState {
  return {
    count,
    limit,
    canCreate: count < limit,
  }
}

export function workflowLimitReachedMessage(limit: number) {
  return `Workflow limit reached (${limit} workflows per account). Delete an existing workflow or upgrade to Pro.`
}

export async function countUserWorkflows(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("workflows")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message ?? "Failed to count workflows.")
  }

  return count ?? 0
}

async function resolveCurrentPlan(): Promise<PlanTier> {
  const { getUserPlan } = await import("@/lib/data/billing")
  return getUserPlan()
}

export async function resolveWorkflowLimit(): Promise<number> {
  const plan = await resolveCurrentPlan()
  return workflowLimitForPlan(plan)
}

export async function assertWorkflowLimitNotReached(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const [count, limit] = await Promise.all([
    countUserWorkflows(supabase, userId),
    resolveWorkflowLimit(),
  ])
  const limitState = buildWorkflowLimitState(count, limit)

  if (!limitState.canCreate) {
    throw new Error(workflowLimitReachedMessage(limitState.limit))
  }
}
