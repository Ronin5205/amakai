import type { Workflow } from "@/lib/domain/workflow"
import {
  createEmptyDraftWorkflow,
  isPersistedWorkflowId,
  mapWorkflowRow,
  toWorkflowGraphPayload,
  type WorkflowRow,
} from "@/lib/data/workflow-mappers"
import { createClient } from "@/utils/supabase/server"

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

    return mapWorkflowRow(data as WorkflowRow)
  }

  return createEmptyDraftWorkflow()
}

export async function saveWorkflowDraft(workflow: Workflow): Promise<Workflow> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to save workflow drafts.")
  }

  const payload = {
    name: workflow.name.trim() || "Untitled workflow",
    status: workflow.status ?? "draft",
    graph: toWorkflowGraphPayload(workflow),
    updated_at: workflow.updatedAt,
  }

  if (isPersistedWorkflowId(workflow.id)) {
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

    return mapWorkflowRow(data as WorkflowRow)
  }

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

  return mapWorkflowRow(data as WorkflowRow)
}

export async function createWorkflowDraft(name?: string): Promise<Workflow> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to create workflows.")
  }

  const { data, error } = await auth.supabase
    .from("workflows")
    .insert({
      user_id: auth.userId,
      name: name?.trim() || "Untitled workflow",
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
}
