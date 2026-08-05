import type { PlanTier } from "@/lib/domain/billing"

export type UserProfileSummary = {
  email: string
  username: string | null
  displayName: string | null
  createdAt: string
  plan: PlanTier
  hasStripeCustomer: boolean
  subscriptionStatus: string | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  workflowCount: number
  tableCount: number
  secretCount: number
}

export type DeleteUserDataResult = {
  deletedWorkflows: number
  deletedTables: number
  deletedSecrets: number
}
