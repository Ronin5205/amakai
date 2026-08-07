import type { Workflow } from "@/lib/domain/workflow"
import { getWorkflowPublishState } from "@/lib/data/deployments"
import {
  assertWorkflowLimitNotReached,
  buildWorkflowLimitState,
  countUserWorkflows,
  resolveWorkflowLimit,
  type WorkflowLimitState,
} from "@/lib/data/workflow-limits"
import {
  assertUniqueWorkflowName,
  cloneWorkflowGraph,
  generateUniqueWorkflowName,
} from "@/lib/data/workflow-names"
import {
  createEmptyDraftWorkflow,
  isPersistedWorkflowId,
  mapWorkflowRow,
  toWorkflowGraphPayload,
  type WorkflowRow,
} from "@/lib/data/workflow-mappers"
import { parseResourceName } from "@/lib/validation/resource-names"
import { validateWorkflowDraft } from "@/lib/validation/workflow-node-config"
import { createClient } from "@/utils/supabase/server"
import {
  removeWorkflowWorkspaceChunk,
  syncWorkflowWorkspaceChunk,
} from "@/lib/ai/workspace-sync"

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

export async function listWorkflows(): Promise<Workflow[]> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return []
  }

  const { data, error } = await auth.supabase
    .from("workflows")
    .select("*")
    .eq("user_id", auth.userId)
    .order("updated_at", { ascending: false })

  if (error || !data) {
    return []
  }

  return (data as WorkflowRow[]).map(mapWorkflowRow)
}

export async function getWorkflowLimitState(): Promise<WorkflowLimitState | null> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return null
  }

  const [count, limit] = await Promise.all([
    countUserWorkflows(auth.supabase, auth.userId),
    resolveWorkflowLimit(),
  ])
  return buildWorkflowLimitState(count, limit)
}

export async function getWorkflowDraft(workflowId?: string): Promise<Workflow> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return createEmptyDraftWorkflow()
  }

  if (workflowId && isPersistedWorkflowId(workflowId)) {
    const { data, error } = await auth.supabase
      .from("workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("user_id", auth.userId)
      .maybeSingle()

    if (error || !data) {
      return createEmptyDraftWorkflow()
    }

    const row = data as WorkflowRow
    const publishState = await getWorkflowPublishState(
      auth.supabase,
      auth.userId,
      row
    )

    return {
      ...mapWorkflowRow(row),
      ...publishState,
    }
  }

  return createEmptyDraftWorkflow()
}

export async function saveWorkflowDraft(workflow: Workflow): Promise<Workflow> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to save workflow drafts.")
  }

  const validated = validateWorkflowDraft(workflow)
  if (!validated.ok) {
    throw new Error(validated.error)
  }

  const payload = {
    name: validated.name,
    status: workflow.status ?? "draft",
    graph: toWorkflowGraphPayload(workflow),
    updated_at: workflow.updatedAt,
  }

  if (isPersistedWorkflowId(workflow.id)) {
    await assertUniqueWorkflowName(
      auth.supabase,
      auth.userId,
      payload.name,
      workflow.id
    )

    const { data, error } = await auth.supabase
      .from("workflows")
      .update(payload)
      .eq("id", workflow.id)
      .eq("user_id", auth.userId)
      .select("*")
      .single()

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to update workflow draft.")
    }

    const saved = mapWorkflowRow(data as WorkflowRow)
    void syncWorkflowWorkspaceChunk({
      userId: auth.userId,
      workflow: saved,
    }).catch(() => {})
    return saved
  }

  await assertUniqueWorkflowName(auth.supabase, auth.userId, payload.name)
  await assertWorkflowLimitNotReached(auth.supabase, auth.userId)

  const { data, error } = await auth.supabase
    .from("workflows")
    .insert({
      user_id: auth.userId,
      ...payload,
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create workflow draft.")
  }

  const saved = mapWorkflowRow(data as WorkflowRow)
  void syncWorkflowWorkspaceChunk({
    userId: auth.userId,
    workflow: saved,
  }).catch(() => {})
  return saved
}

export async function createWorkflowDraft(name?: string): Promise<Workflow> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to create workflows.")
  }

  await assertWorkflowLimitNotReached(auth.supabase, auth.userId)

  const parsedName = parseResourceName(name ?? "", "Untitled workflow")
  if (!parsedName.ok) {
    throw new Error(parsedName.error)
  }

  const uniqueName = await generateUniqueWorkflowName(
    auth.supabase,
    auth.userId,
    parsedName.name
  )

  const { data, error } = await auth.supabase
    .from("workflows")
    .insert({
      user_id: auth.userId,
      name: uniqueName,
      status: "draft",
      graph: { nodes: [], edges: [] },
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create workflow.")
  }

  return mapWorkflowRow(data as WorkflowRow)
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to delete workflows.")
  }

  if (!isPersistedWorkflowId(workflowId)) {
    throw new Error("Workflow not found.")
  }

  const { error } = await auth.supabase
    .from("workflows")
    .delete()
    .eq("id", workflowId)
    .eq("user_id", auth.userId)

  if (error) {
    throw new Error(error.message ?? "Failed to delete workflow.")
  }

  void removeWorkflowWorkspaceChunk({
    userId: auth.userId,
    workflowId,
  }).catch(() => {})
}

export async function duplicateWorkflow(workflowId: string): Promise<Workflow> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to duplicate workflows.")
  }

  if (!isPersistedWorkflowId(workflowId)) {
    throw new Error("Workflow not found.")
  }

  const { data: source, error: sourceError } = await auth.supabase
    .from("workflows")
    .select("*")
    .eq("id", workflowId)
    .eq("user_id", auth.userId)
    .single()

  if (sourceError || !source) {
    throw new Error("Workflow not found.")
  }

  await assertWorkflowLimitNotReached(auth.supabase, auth.userId)

  const mapped = mapWorkflowRow(source as WorkflowRow)
  const uniqueName = await generateUniqueWorkflowName(
    auth.supabase,
    auth.userId,
    `${mapped.name} copy`
  )
  const clonedGraph = cloneWorkflowGraph(
    mapped.nodes,
    mapped.edges ?? []
  )

  const { data, error } = await auth.supabase
    .from("workflows")
    .insert({
      user_id: auth.userId,
      name: uniqueName,
      status: "draft",
      graph: clonedGraph,
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to duplicate workflow.")
  }

  return mapWorkflowRow(data as WorkflowRow)
}
