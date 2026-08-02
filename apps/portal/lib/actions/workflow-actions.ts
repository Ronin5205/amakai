"use server"

import { revalidatePath } from "next/cache"

import { deployWorkflowDraft } from "@/lib/data/deployments"
import {
  createWorkflowDraft,
  deleteWorkflow,
  duplicateWorkflow,
  saveWorkflowDraft,
} from "@/lib/data/workflows"
import type { Workflow } from "@/lib/domain/workflow"

export type SaveWorkflowDraftResult =
  | { workflow: Workflow }
  | { error: string }

export async function saveWorkflowDraftAction(
  workflow: Workflow
): Promise<SaveWorkflowDraftResult> {
  try {
    const saved = await saveWorkflowDraft(workflow)
    return { workflow: saved }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to save workflow draft.",
    }
  }
}

export type CreateWorkflowResult = { workflow: Workflow } | { error: string }

export async function createWorkflowAction(
  name?: string
): Promise<CreateWorkflowResult> {
  try {
    const workflow = await createWorkflowDraft(name)
    revalidatePath("/")
    revalidatePath("/design/workflow-editor")
    return { workflow }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to create workflow.",
    }
  }
}

export type DeleteWorkflowResult = { success: true } | { error: string }

export async function deleteWorkflowAction(
  workflowId: string
): Promise<DeleteWorkflowResult> {
  try {
    await deleteWorkflow(workflowId)
    revalidatePath("/")
    revalidatePath("/design/workflows")
    revalidatePath("/design/workflow-editor")
    return { success: true }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete workflow.",
    }
  }
}

export type DuplicateWorkflowResult = { workflow: Workflow } | { error: string }

export async function duplicateWorkflowAction(
  workflowId: string
): Promise<DuplicateWorkflowResult> {
  try {
    const workflow = await duplicateWorkflow(workflowId)
    revalidatePath("/")
    revalidatePath("/design/workflows")
    revalidatePath("/design/workflow-editor")
    return { workflow }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to duplicate workflow.",
    }
  }
}

export type DeployWorkflowResult =
  | { deployedAt: string }
  | { error: string }

export async function deployWorkflowAction(
  workflowId: string
): Promise<DeployWorkflowResult> {
  try {
    const result = await deployWorkflowDraft(workflowId)
    revalidatePath("/")
    revalidatePath("/design/workflow-editor")
    revalidatePath("/operate/live-workflows")
    return result
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to deploy workflow.",
    }
  }
}
