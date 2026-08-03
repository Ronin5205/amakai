"use server"

import { revalidatePath } from "next/cache"

import {
  createManualSecret,
  deleteSecret,
  renameSecret,
  type CreateManualSecretInput,
} from "@/lib/data/secrets"
import type { Secret, SecretKind } from "@/lib/domain/secret"

export type CreateSecretResult = { secret: Secret } | { error: string }

export async function createManualSecretAction(
  input: CreateManualSecretInput
): Promise<CreateSecretResult> {
  try {
    const secret = await createManualSecret(input)
    revalidatePath("/resources/secrets")
    revalidatePath("/design/workflow-editor")
    return { secret }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create secret.",
    }
  }
}

export type DeleteSecretResult = { success: true } | { error: string }

export async function deleteSecretAction(
  secretId: string
): Promise<DeleteSecretResult> {
  try {
    await deleteSecret(secretId)
    revalidatePath("/resources/secrets")
    revalidatePath("/design/workflow-editor")
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete secret.",
    }
  }
}

export type RenameSecretResult = { secret: Secret } | { error: string }

export async function renameSecretAction(
  secretId: string,
  name: string
): Promise<RenameSecretResult> {
  try {
    const secret = await renameSecret(secretId, name)
    revalidatePath("/resources/secrets")
    revalidatePath("/design/workflow-editor")
    return { secret }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to rename secret.",
    }
  }
}

export type StartOAuthResult = { url: string } | { error: string }

export async function startGmailOAuthAction(
  secretName?: string
): Promise<StartOAuthResult> {
  try {
    const { buildGmailAuthorizeUrl } = await import(
      "@/lib/integrations/auth/gmail-oauth"
    )
    const url = await buildGmailAuthorizeUrl(secretName)
    return { url }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to start Gmail OAuth.",
    }
  }
}

export async function startOutlookOAuthAction(
  secretName?: string
): Promise<StartOAuthResult> {
  try {
    const { buildOutlookAuthorizeUrl } = await import(
      "@/lib/integrations/auth/outlook-oauth"
    )
    const url = await buildOutlookAuthorizeUrl(secretName)
    return { url }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to start Outlook OAuth.",
    }
  }
}

export type ManualSecretKind = Exclude<
  SecretKind,
  "oauth_gmail" | "oauth_outlook"
>
