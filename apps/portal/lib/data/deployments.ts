import type {
  DeployWorkflowResult,
  LiveWorkflow,
  LiveWorkflowDetail,
} from "@/lib/domain/deployment"
import { workflowGraphSignature } from "@/lib/data/workflow-graph-signature"
import {
  mapWorkflowRow,
  type WorkflowGraphPayload,
  type WorkflowRow,
} from "@/lib/data/workflow-mappers"
import { createClient } from "@/utils/supabase/server"

const PRODUCTION_ENVIRONMENT = {
  name: "Production",
  kind: "production" as const,
  status: "active" as const,
}

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

async function ensureProductionEnvironment(userId: string) {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("environments")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "production")
    .maybeSingle()

  if (existing) {
    return existing.id
  }

  const { data: created, error } = await supabase
    .from("environments")
    .insert({
      user_id: userId,
      name: PRODUCTION_ENVIRONMENT.name,
      kind: PRODUCTION_ENVIRONMENT.kind,
      status: PRODUCTION_ENVIRONMENT.status,
      deployed_version: "—",
      health: "healthy",
      workflow_count: 0,
    })
    .select("id")
    .single()

  if (error || !created) {
    throw new Error(error?.message ?? "Failed to create production environment.")
  }

  return created.id
}

export async function deployWorkflowDraft(
  workflowId: string
): Promise<DeployWorkflowResult> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to deploy workflows.")
  }

  const environmentId = await ensureProductionEnvironment(auth.userId)

  const { data: workflow, error: workflowError } = await auth.supabase
    .from("workflows")
    .select("*")
    .eq("id", workflowId)
    .eq("user_id", auth.userId)
    .single()

  if (workflowError || !workflow) {
    throw new Error("Workflow not found.")
  }

  const graph = (workflow as WorkflowRow).graph
  const deployedAt = new Date().toISOString()

  const { error: deleteVersionsError } = await auth.supabase
    .from("workflow_versions")
    .delete()
    .eq("workflow_id", workflowId)
    .eq("user_id", auth.userId)

  if (deleteVersionsError) {
    throw new Error(
      deleteVersionsError.message ?? "Failed to replace the live workflow version."
    )
  }

  const { data: versionRow, error: versionError } = await auth.supabase
    .from("workflow_versions")
    .insert({
      workflow_id: workflowId,
      user_id: auth.userId,
      version: "live",
      graph,
      created_at: deployedAt,
    })
    .select("*")
    .single()

  if (versionError || !versionRow) {
    throw new Error(versionError?.message ?? "Failed to publish workflow.")
  }

  await auth.supabase
    .from("workflows")
    .update({ status: "published", updated_at: deployedAt })
    .eq("id", workflowId)
    .eq("user_id", auth.userId)

  const { count: liveWorkflowCount } = await auth.supabase
    .from("workflows")
    .select("*", { count: "exact", head: true })
    .eq("user_id", auth.userId)
    .eq("status", "published")

  const { error: environmentUpdateError } = await auth.supabase
    .from("environments")
    .update({
      deployed_version: "live",
      status: "active",
      health: "healthy",
      workflow_count: liveWorkflowCount ?? 0,
    })
    .eq("id", environmentId)
    .eq("user_id", auth.userId)

  if (environmentUpdateError) {
    throw new Error(
      environmentUpdateError.message ?? "Failed to update production environment."
    )
  }

  const { error: releaseError } = await auth.supabase.from("releases").insert({
    environment_id: environmentId,
    workflow_version_id: versionRow.id,
    user_id: auth.userId,
    environment_name: PRODUCTION_ENVIRONMENT.name,
    version: "live",
    status: "deployed",
    deployed_at: deployedAt,
  })

  if (releaseError) {
    throw new Error(releaseError.message ?? "Failed to record deployment.")
  }

  return { deployedAt }
}

export async function listLiveWorkflows(): Promise<LiveWorkflow[]> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return []
  }

  const { data: workflows, error: workflowError } = await auth.supabase
    .from("workflows")
    .select("id, name, updated_at")
    .eq("user_id", auth.userId)
    .eq("status", "published")
    .order("updated_at", { ascending: false })

  if (workflowError || !workflows || workflows.length === 0) {
    return []
  }

  const workflowIds = workflows.map((workflow) => workflow.id)

  const { data: versions } = await auth.supabase
    .from("workflow_versions")
    .select("workflow_id, created_at, graph")
    .eq("user_id", auth.userId)
    .in("workflow_id", workflowIds)
    .order("created_at", { ascending: false })

  const deployedAtByWorkflowId = new Map<string, string>()
  const versionGraphByWorkflowId = new Map<string, WorkflowGraphPayload>()
  for (const version of versions ?? []) {
    if (!deployedAtByWorkflowId.has(version.workflow_id)) {
      deployedAtByWorkflowId.set(version.workflow_id, version.created_at)
      versionGraphByWorkflowId.set(
        version.workflow_id,
        version.graph as WorkflowGraphPayload
      )
    }
  }

  return workflows.flatMap((workflow) => {
    const versionGraph = versionGraphByWorkflowId.get(workflow.id)
    if (!versionGraph) {
      return []
    }

    const nodes = versionGraph.nodes ?? []
    const triggerNode = nodes.find((node) => node.kind === "trigger")
    const triggerType =
      typeof triggerNode?.config?.triggerType === "string"
        ? triggerNode.config.triggerType
        : undefined

    return {
      id: workflow.id,
      name: workflow.name,
      deployedAt: deployedAtByWorkflowId.get(workflow.id) ?? workflow.updated_at,
      updatedAt: deployedAtByWorkflowId.get(workflow.id) ?? workflow.updated_at,
      health: "healthy" as const,
      nodeCount: nodes.length,
      triggerType,
    }
  })
}

type PublishedWorkflowVersion = {
  graph: WorkflowGraphPayload
  createdAt: string
}

async function getPublishedWorkflowVersion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  workflowId: string
): Promise<PublishedWorkflowVersion | null> {
  const { data: version } = await supabase
    .from("workflow_versions")
    .select("graph, created_at")
    .eq("workflow_id", workflowId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!version?.graph) {
    return null
  }

  return {
    graph: version.graph as WorkflowGraphPayload,
    createdAt: version.created_at,
  }
}

export async function getPublishedWorkflowGraph(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  workflowId: string
): Promise<WorkflowGraphPayload | null> {
  const version = await getPublishedWorkflowVersion(supabase, userId, workflowId)
  return version?.graph ?? null
}

export async function getLiveWorkflow(
  workflowId: string
): Promise<LiveWorkflowDetail | null> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return null
  }

  const { data: workflow, error } = await auth.supabase
    .from("workflows")
    .select("*")
    .eq("id", workflowId)
    .eq("user_id", auth.userId)
    .eq("status", "published")
    .maybeSingle()

  if (error || !workflow) {
    return null
  }

  const publishedVersion = await getPublishedWorkflowVersion(
    auth.supabase,
    auth.userId,
    workflowId
  )

  if (!publishedVersion) {
    return null
  }

  const mapped = mapWorkflowRow(workflow as WorkflowRow)
  const nodes = publishedVersion.graph.nodes ?? []
  const edges = publishedVersion.graph.edges ?? []
  const triggerNode = nodes.find((node) => node.kind === "trigger")
  const triggerType =
    typeof triggerNode?.config?.triggerType === "string"
      ? triggerNode.config.triggerType
      : undefined

  return {
    id: mapped.id,
    name: mapped.name,
    deployedAt: publishedVersion.createdAt,
    updatedAt: publishedVersion.createdAt,
    health: "healthy",
    nodeCount: nodes.length,
    triggerType,
    nodes,
    edges,
  }
}

export async function getWorkflowPublishState(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  workflow: WorkflowRow
): Promise<{
  publishedAt: string | null
  publishedGraphSignature: string | null
  hasUnpublishedChanges: boolean
}> {
  const publishedVersion = await getPublishedWorkflowVersion(
    supabase,
    userId,
    workflow.id
  )

  if (!publishedVersion) {
    return {
      publishedAt: null,
      publishedGraphSignature: null,
      hasUnpublishedChanges: false,
    }
  }

  const draftGraph = workflow.graph as WorkflowGraphPayload
  const publishedGraphSignature = workflowGraphSignature(publishedVersion.graph)
  const draftGraphSignature = workflowGraphSignature(draftGraph)

  return {
    publishedAt: publishedVersion.createdAt,
    publishedGraphSignature,
    hasUnpublishedChanges: draftGraphSignature !== publishedGraphSignature,
  }
}
