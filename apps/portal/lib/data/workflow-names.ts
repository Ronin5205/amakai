import { cloneWorkflowGraph } from "@/lib/design/workflow-graph"
import { createClient } from "@/utils/supabase/server"

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

function normalizeWorkflowName(name: string) {
  return name.trim() || "Untitled workflow"
}

export async function assertUniqueWorkflowName(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  excludeWorkflowId?: string
) {
  const normalizedName = normalizeWorkflowName(name)

  let query = supabase
    .from("workflows")
    .select("id, name")
    .eq("user_id", userId)

  if (excludeWorkflowId) {
    query = query.neq("id", excludeWorkflowId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message ?? "Failed to validate workflow name.")
  }

  const duplicate = (data ?? []).find(
    (row) => row.name.trim().toLowerCase() === normalizedName.toLowerCase()
  )

  if (duplicate) {
    throw new Error(`A workflow named "${duplicate.name}" already exists.`)
  }
}

export async function generateUniqueWorkflowName(
  supabase: SupabaseClient,
  userId: string,
  baseName: string
) {
  const root = normalizeWorkflowName(baseName)
  const { data, error } = await supabase
    .from("workflows")
    .select("name")
    .eq("user_id", userId)

  if (error) {
    return root
  }

  const existing = new Set(
    (data ?? []).map((row) => row.name.trim().toLowerCase())
  )

  if (!existing.has(root.toLowerCase())) {
    return root
  }

  let index = 2
  while (existing.has(`${root} ${index}`.toLowerCase())) {
    index += 1
  }

  return `${root} ${index}`
}

export { normalizeWorkflowName, cloneWorkflowGraph }
