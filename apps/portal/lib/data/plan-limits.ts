import type { PlanTier } from "@/lib/domain/billing"
import { AI_TOKEN_ALLOWANCE } from "@/lib/ai/quota"

/** Soft resource caps — Pro gets higher limits as promised in PLAN_DEFINITIONS. */
export const WORKFLOW_LIMIT_BY_PLAN: Record<PlanTier, number> = {
  free: 10,
  pro: 50,
}

export const DATA_TABLE_LIMIT_BY_PLAN: Record<PlanTier, number> = {
  free: 10,
  pro: 50,
}

export function workflowLimitForPlan(plan: PlanTier): number {
  return WORKFLOW_LIMIT_BY_PLAN[plan]
}

export function dataTableLimitForPlan(plan: PlanTier): number {
  return DATA_TABLE_LIMIT_BY_PLAN[plan]
}

export function aiTokenAllowanceForPlan(plan: PlanTier): number {
  return AI_TOKEN_ALLOWANCE[plan]
}
