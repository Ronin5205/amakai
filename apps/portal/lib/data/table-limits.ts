import { createClient } from "@/utils/supabase/server"
import { dataTableLimitForPlan } from "@/lib/data/plan-limits"
import type { PlanTier } from "@/lib/domain/billing"

export type DataTableLimitState = {
  count: number
  limit: number
  canCreate: boolean
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export function buildDataTableLimitState(
  count: number,
  limit: number
): DataTableLimitState {
  return {
    count,
    limit,
    canCreate: count < limit,
  }
}

export function dataTableLimitReachedMessage(limit: number) {
  return `Table limit reached (${limit} tables per account). Delete an existing table or upgrade to Pro.`
}

export async function countUserDataTables(
  supabase: SupabaseClient,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("data_tables")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message ?? "Failed to count data tables.")
  }

  return count ?? 0
}

async function resolveCurrentPlan(): Promise<PlanTier> {
  const { getUserPlan } = await import("@/lib/data/billing")
  return getUserPlan()
}

export async function resolveDataTableLimit(): Promise<number> {
  const plan = await resolveCurrentPlan()
  return dataTableLimitForPlan(plan)
}

export async function assertDataTableLimitNotReached(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const [count, limit] = await Promise.all([
    countUserDataTables(supabase, userId),
    resolveDataTableLimit(),
  ])
  const limitState = buildDataTableLimitState(count, limit)

  if (!limitState.canCreate) {
    throw new Error(dataTableLimitReachedMessage(limitState.limit))
  }
}
