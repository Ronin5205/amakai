import { getUsername } from "@/lib/auth/user"
import { getBillingProfileForUser } from "@/lib/data/billing"
import type {
  DeleteUserDataResult,
  UserProfileSummary,
} from "@/lib/domain/settings"
import { countUserSecrets } from "@/lib/data/secrets"
import { countUserDataTables } from "@/lib/data/table-limits"
import { countUserWorkflows } from "@/lib/data/workflow-limits"
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

  return { supabase, userId: user.id, user }
}

export async function getUserProfileSummary(): Promise<UserProfileSummary | null> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return null
  }

  const [workflowCount, tableCount, secretCount, billing] = await Promise.all([
    countUserWorkflows(auth.supabase, auth.userId),
    countUserDataTables(auth.supabase, auth.userId),
    countUserSecrets(auth.supabase, auth.userId),
    getBillingProfileForUser(auth.supabase, auth.userId),
  ])

  const displayName =
    typeof auth.user.user_metadata?.display_name === "string"
      ? auth.user.user_metadata.display_name
      : null

  return {
    email: auth.user.email ?? "",
    username: getUsername(auth.user),
    displayName,
    createdAt: auth.user.created_at,
    plan: billing.plan,
    hasStripeCustomer: billing.hasStripeCustomer,
    subscriptionStatus: billing.subscriptionStatus,
    cancelAtPeriodEnd: billing.cancelAtPeriodEnd,
    currentPeriodEnd: billing.currentPeriodEnd,
    workflowCount,
    tableCount,
    secretCount,
  }
}

export async function deleteAllWorkflows(): Promise<number> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to delete workflows.")
  }

  const count = await countUserWorkflows(auth.supabase, auth.userId)

  const { error } = await auth.supabase
    .from("workflows")
    .delete()
    .eq("user_id", auth.userId)

  if (error) {
    throw new Error(error.message ?? "Failed to delete workflows.")
  }

  return count
}

export async function deleteAllDataTables(): Promise<number> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to delete tables.")
  }

  const count = await countUserDataTables(auth.supabase, auth.userId)

  const { error } = await auth.supabase
    .from("data_tables")
    .delete()
    .eq("user_id", auth.userId)

  if (error) {
    throw new Error(error.message ?? "Failed to delete tables.")
  }

  return count
}

export async function deleteAllUserData(): Promise<DeleteUserDataResult> {
  const deletedWorkflows = await deleteAllWorkflows()
  const deletedTables = await deleteAllDataTables()

  return {
    deletedWorkflows,
    deletedTables,
  }
}

export async function deleteOwnAccount(): Promise<void> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to delete your account.")
  }

  const { error } = await auth.supabase.rpc("delete_own_account")

  if (error) {
    throw new Error(error.message ?? "Failed to delete account.")
  }
}
