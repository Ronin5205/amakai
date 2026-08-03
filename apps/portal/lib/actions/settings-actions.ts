"use server"

import { revalidatePath } from "next/cache"

import {
  deleteAllDataTables,
  deleteAllUserData,
  deleteAllWorkflows,
  deleteOwnAccount,
} from "@/lib/data/user-settings"

function revalidateUserContentPaths() {
  revalidatePath("/")
  revalidatePath("/settings")
  revalidatePath("/design/workflows")
  revalidatePath("/design/workflow-editor")
  revalidatePath("/design/tables")
  revalidatePath("/design/testing")
  revalidatePath("/operate/live-workflows")
  revalidatePath("/production/runs")
  revalidatePath("/production/history")
}

export type SettingsActionResult =
  | { success: true; deletedCount?: number }
  | { error: string }

export async function deleteAllWorkflowsAction(): Promise<SettingsActionResult> {
  try {
    const deletedCount = await deleteAllWorkflows()
    revalidateUserContentPaths()
    return { success: true, deletedCount }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete workflows.",
    }
  }
}

export async function deleteAllDataTablesAction(): Promise<SettingsActionResult> {
  try {
    const deletedCount = await deleteAllDataTables()
    revalidateUserContentPaths()
    return { success: true, deletedCount }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete tables.",
    }
  }
}

export async function deleteAllUserDataAction(): Promise<SettingsActionResult> {
  try {
    await deleteAllUserData()
    revalidateUserContentPaths()
    return { success: true }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete user data.",
    }
  }
}

export async function deleteAccountAction(): Promise<SettingsActionResult> {
  try {
    await deleteOwnAccount()
    return { success: true }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to delete account.",
    }
  }
}
