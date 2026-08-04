"use server"

import { revalidatePath } from "next/cache"

import {
  isProCheckoutEnabled,
  isStripeConfigured,
  openBillingPortalSession,
  reconcileCheckoutSession,
  refreshCurrentUserSubscriptionFromStripe,
  startProCheckoutSession,
} from "@/lib/stripe"
import { getBillingProfile } from "@/lib/data/billing"
import type { BillingProfile } from "@/lib/domain/billing"

export type StripeBillingActionResult =
  | { url: string }
  | { error: string }

export type ReconcileCheckoutResult =
  | { status: "synced" | "pending" | "cancelled" | "ignored" }
  | { error: string }

export type BillingStatusResult =
  | { profile: BillingProfile }
  | { error: string }

function revalidateBillingPaths() {
  revalidatePath("/admin/billing")
  revalidatePath("/settings")
}

/** Opens Stripe Customer Portal. No client-supplied parameters. */
export async function createStripePortalSessionAction(): Promise<StripeBillingActionResult> {
  try {
    if (!isStripeConfigured()) {
      return {
        error: "Stripe is not configured yet.",
      }
    }

    const { url } = await openBillingPortalSession()
    revalidateBillingPaths()
    return { url }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to open Stripe billing portal.",
    }
  }
}

/**
 * Pro checkout — server decides price. Clients cannot pass amount/price IDs.
 * Remains disabled until STRIPE_PRO_PRICE_ID is configured.
 */
export async function createProCheckoutSessionAction(): Promise<StripeBillingActionResult> {
  try {
    if (!isProCheckoutEnabled()) {
      return { error: "Pro checkout is not available yet." }
    }

    const { url } = await startProCheckoutSession()
    return { url }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to start Pro checkout.",
    }
  }
}

/**
 * Verifies Checkout with Stripe after redirect. Does not trust query flags alone.
 */
export async function reconcileCheckoutSessionAction(
  sessionId: string
): Promise<ReconcileCheckoutResult> {
  try {
    if (!isStripeConfigured()) {
      return { error: "Stripe is not configured yet." }
    }

    const result = await reconcileCheckoutSession(sessionId)
    revalidateBillingPaths()
    return result
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to confirm checkout with Stripe.",
    }
  }
}

/** Refresh entitlements from Stripe and return the latest public billing profile. */
export async function refreshBillingStatusAction(): Promise<BillingStatusResult> {
  try {
    if (!isStripeConfigured()) {
      const profile = await getBillingProfile()
      if (!profile) {
        return { error: "Sign in to view billing." }
      }
      return { profile }
    }

    try {
      await refreshCurrentUserSubscriptionFromStripe()
    } catch {
      // Still return stored profile if Stripe is briefly unreachable.
    }

    const profile = await getBillingProfile()
    if (!profile) {
      return { error: "Sign in to view billing." }
    }

    revalidateBillingPaths()
    return { profile }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to refresh billing status.",
    }
  }
}
