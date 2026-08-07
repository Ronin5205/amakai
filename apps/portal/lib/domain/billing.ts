export type PlanTier = "free" | "pro"

/** Safe client-facing billing summary — never includes raw Stripe IDs. */
export type BillingProfile = {
  plan: PlanTier
  hasStripeCustomer: boolean
  subscriptionStatus: string | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  updatedAt: string | null
}

export type PlanDefinition = {
  id: PlanTier
  name: string
  description: string
  priceLabel: string
  features: string[]
  available: boolean
}

export const PLAN_DEFINITIONS: Record<PlanTier, PlanDefinition> = {
  free: {
    id: "free",
    name: "Starter",
    description: "Everything you need to design and run workflows.",
    priceLabel: "Free",
    features: [
      "Up to 10 workflows",
      "Up to 10 data tables",
      "1,000 AI credits / month",
      "Secrets vault",
      "Production runs and logs",
    ],
    available: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Higher limits and expanded capacity for growing teams.",
    priceLabel: "$5 per month",
    features: [
      "Up to 50 workflows",
      "Up to 50 data tables",
      "10,000 AI credits / month",
      "Priority support",
      "Expanded AI orchestration",
    ],
    available: true,
  },
}

export function planDisplayName(plan: PlanTier): string {
  return PLAN_DEFINITIONS[plan].name
}

export function isActiveProSubscription(status: string | null | undefined) {
  return status === "active" || status === "trialing"
}

/**
 * Pro only when Stripe status is active/trialing AND the subscription includes
 * our configured Pro price ID. Wrong-price charges must not upgrade the plan.
 * Cancel-at-period-end stays Pro until the period actually ends.
 */
export function planFromVerifiedSubscription(input: {
  status: string | null | undefined
  priceIds: string[]
  expectedProPriceId: string | null
}): PlanTier {
  if (!input.expectedProPriceId) {
    return "free"
  }

  const hasProPrice = input.priceIds.includes(input.expectedProPriceId)
  if (!hasProPrice) {
    return "free"
  }

  return isActiveProSubscription(input.status) ? "pro" : "free"
}

function formatPeriodEnd(iso: string | null | undefined): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  // Fixed locale — avoid SSR/client hydration mismatches from `undefined` locale.
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date)
}

/** Human-readable subscription label for Settings / Billing. */
export function formatSubscriptionLabel(input: {
  plan: PlanTier
  subscriptionStatus: string | null
  cancelAtPeriodEnd?: boolean
  currentPeriodEnd?: string | null
}): string {
  const {
    plan,
    subscriptionStatus,
    cancelAtPeriodEnd = false,
    currentPeriodEnd = null,
  } = input

  if (!subscriptionStatus && plan === "free") {
    return "None"
  }

  const endsOn = formatPeriodEnd(currentPeriodEnd)

  if (
    cancelAtPeriodEnd &&
    (subscriptionStatus === "active" || subscriptionStatus === "trialing")
  ) {
    return endsOn
      ? `Active until ${endsOn}`
      : "Active until end of billing period"
  }

  if (subscriptionStatus === "active") {
    return endsOn ? `Active — renews ${endsOn}` : "Active"
  }

  if (subscriptionStatus === "trialing") {
    return endsOn ? `Trialing — ends ${endsOn}` : "Trialing"
  }

  if (subscriptionStatus === "canceled" || subscriptionStatus === "cancelled") {
    return "Canceled"
  }

  if (subscriptionStatus) {
    return subscriptionStatus
  }

  return plan === "pro" ? "Active" : "None"
}
