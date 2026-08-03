import { createClient } from "@/utils/supabase/server"

export const MAX_DATA_TABLES_PER_USER = 10

export type DataTableLimitState = {
  count: number
  limit: number
  canCreate: boolean
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export function buildDataTableLimitState(count: number): DataTableLimitState {
  return {
    count,
    limit: MAX_DATA_TABLES_PER_USER,
    canCreate: count < MAX_DATA_TABLES_PER_USER,
  }
}

export function dataTableLimitReachedMessage(
  limit = MAX_DATA_TABLES_PER_USER
) {
  return `Table limit reached (${limit} tables per account). Delete an existing table to create a new one.`
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

export async function assertDataTableLimitNotReached(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const count = await countUserDataTables(supabase, userId)
  const limitState = buildDataTableLimitState(count)

  if (!limitState.canCreate) {
    throw new Error(dataTableLimitReachedMessage(limitState.limit))
  }
}
