import { createClient } from "@/utils/supabase/server"

export const MAX_WORKFLOWS_PER_USER = 10

export type WorkflowLimitState = {
  count: number
  limit: number
  canCreate: boolean
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

export function buildWorkflowLimitState(count: number): WorkflowLimitState {
  return {
    count,
    limit: MAX_WORKFLOWS_PER_USER,
    canCreate: count < MAX_WORKFLOWS_PER_USER,
  }
}

export function workflowLimitReachedMessage(limit = MAX_WORKFLOWS_PER_USER) {
  return `Workflow limit reached (${limit} workflows per account). Delete an existing workflow to create a new one.`
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

export async function assertWorkflowLimitNotReached(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const count = await countUserWorkflows(supabase, userId)
  const limitState = buildWorkflowLimitState(count)

  if (!limitState.canCreate) {
    throw new Error(workflowLimitReachedMessage(limitState.limit))
  }
}
