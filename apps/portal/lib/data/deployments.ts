import type {
  Environment,
  Release,
  WorkflowVersion,
} from "@/lib/domain/deployment"
import { type WorkflowRow } from "@/lib/data/workflow-mappers"
import { createClient } from "@/utils/supabase/server"

const DEFAULT_ENVIRONMENTS = [
  { name: "Development", kind: "development" as const, status: "active" as const },
  { name: "Staging", kind: "staging" as const, status: "active" as const },
  { name: "Production", kind: "production" as const, status: "inactive" as const },
]

async function getAuthenticatedUserId() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return { supabase, userId: user.id }
}

export async function ensureDefaultEnvironments(userId: string) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("environments")
    .select("id")
    .eq("user_id", userId)
    .limit(1)

  if (existing && existing.length > 0) {
    return
  }

  await supabase.from("environments").insert(
    DEFAULT_ENVIRONMENTS.map((environment) => ({
      user_id: userId,
      name: environment.name,
      kind: environment.kind,
      status: environment.status,
      deployed_version: "—",
      health: "healthy",
      workflow_count: 0,
    }))
  )
}

export async function deployWorkflowDraft(
  workflowId: string,
  environmentId: string
): Promise<{ version: string; environment: string }> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to deploy workflows.")
  }

  await ensureDefaultEnvironments(auth.userId)

  const { data: workflow, error: workflowError } = await auth.supabase
    .from("workflows")
    .select("*")
    .eq("id", workflowId)
    .eq("user_id", auth.userId)
    .single()

  if (workflowError || !workflow) {
    throw new Error("Workflow not found.")
  }

  const { data: environment, error: environmentError } = await auth.supabase
    .from("environments")
    .select("*")
    .eq("id", environmentId)
    .eq("user_id", auth.userId)
    .single()

  if (environmentError || !environment) {
    throw new Error("Environment not found.")
  }

  const { count } = await auth.supabase
    .from("workflow_versions")
    .select("*", { count: "exact", head: true })
    .eq("workflow_id", workflowId)

  const versionNumber = (count ?? 0) + 1
  const versionLabel = `v1.0.${versionNumber}`

  const { data: versionRow, error: versionError } = await auth.supabase
    .from("workflow_versions")
    .insert({
      workflow_id: workflowId,
      user_id: auth.userId,
      version: versionLabel,
      graph: (workflow as WorkflowRow).graph,
    })
    .select("*")
    .single()

  if (versionError || !versionRow) {
    throw new Error(versionError?.message ?? "Failed to create workflow version.")
  }

  const { error: environmentUpdateError } = await auth.supabase
    .from("environments")
    .update({
      deployed_version: versionLabel,
      status: "active",
      health: "healthy",
      workflow_count: 1,
    })
    .eq("id", environmentId)
    .eq("user_id", auth.userId)

  if (environmentUpdateError) {
    throw new Error(
      environmentUpdateError.message ?? "Failed to update environment."
    )
  }

  const { error: releaseError } = await auth.supabase.from("releases").insert({
    environment_id: environmentId,
    workflow_version_id: versionRow.id,
    user_id: auth.userId,
    environment_name: environment.name,
    version: versionLabel,
    status: "deployed",
  })

  if (releaseError) {
    throw new Error(releaseError.message ?? "Failed to record release.")
  }

  await auth.supabase
    .from("workflows")
    .update({ status: "published" })
    .eq("id", workflowId)
    .eq("user_id", auth.userId)

  return {
    version: versionLabel,
    environment: environment.name,
  }
}

export async function listEnvironments(): Promise<Environment[]> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return []
  }

  await ensureDefaultEnvironments(auth.userId)

  const { data, error } = await auth.supabase
    .from("environments")
    .select("*")
    .eq("user_id", auth.userId)
    .order("kind", { ascending: true })

  if (error || !data) {
    return []
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    status: row.status,
    deployedVersion: row.deployed_version,
    health: row.health,
    workflowCount: row.workflow_count,
  }))
}

export async function listVersions(): Promise<WorkflowVersion[]> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return []
  }

  const { data, error } = await auth.supabase
    .from("workflow_versions")
    .select("id, version, created_at, workflow_id, workflows(name)")
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: false })

  if (error || !data) {
    return []
  }

  return data.map((row) => {
    const workflow = row.workflows as { name?: string } | null

    return {
      id: row.id,
      version: row.version,
      workflowName: workflow?.name ?? "Workflow",
      createdAt: row.created_at,
      author: "You",
      isCurrent: false,
    }
  })
}

export async function listReleases(): Promise<Release[]> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return []
  }

  const { data, error } = await auth.supabase
    .from("releases")
    .select("*")
    .eq("user_id", auth.userId)
    .order("deployed_at", { ascending: false })

  if (error || !data) {
    return []
  }

  return data.map((row) => ({
    id: row.id,
    environment: row.environment_name,
    version: row.version,
    status: row.status,
    deployedAt: row.deployed_at,
    deployedBy: "You",
  }))
}
