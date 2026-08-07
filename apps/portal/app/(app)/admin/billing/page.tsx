import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { BillingView } from "@/components/billing/billing-view"
import { SectionPage } from "@/components/section-page"
import { reconcileCheckoutSessionAction } from "@/lib/actions/billing-actions"
import { getBillingProfile } from "@/lib/data/billing"
import { getAiQuotaSnapshot } from "@/lib/data/ai-usage"
import { portalRoutes } from "@/lib/content"
import {
  isProCheckoutEnabled,
  isStripeConfigured,
  refreshCurrentUserSubscriptionFromStripe,
} from "@/lib/stripe"

export const metadata: Metadata = {
  title: "Billing",
}

type BillingPageProps = {
  searchParams: Promise<{
    session_id?: string
    checkout?: string
    welcome?: string
  }>
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = await searchParams
  let notice: "synced" | "pending" | "cancelled" | null = null

  if (params.session_id) {
    const result = await reconcileCheckoutSessionAction(params.session_id)
    if ("error" in result || result.status === "pending") {
      // Never surface reconcile failures — client will auto-refresh until synced.
      notice = "pending"
    } else if (result.status === "synced") {
      notice = "synced"
    } else if (result.status === "cancelled") {
      notice = "cancelled"
    }
  } else if (params.checkout === "cancelled") {
    notice = "cancelled"
  }

  try {
    await refreshCurrentUserSubscriptionFromStripe()
  } catch {
    // Keep rendering with stored billing state if Stripe is briefly unreachable.
  }

  const profile = await getBillingProfile()
  const aiQuota = await getAiQuotaSnapshot().catch(() => null)

  if (!profile) {
    redirect(portalRoutes.signIn)
  }

  // If checkout already granted Pro, treat as synced for the congrats card.
  if (params.welcome === "pro" && profile.plan === "pro") {
    notice = "synced"
  }

  const welcomePro = params.welcome === "pro"
  const awaitingConfirmation =
    welcomePro &&
    profile.plan !== "pro" &&
    (Boolean(params.session_id) || notice === "pending")

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-1 py-2 sm:px-2 lg:px-4">
        <SectionPage
          align="center"
          eyebrow="Administration"
          title="Billing"
          description="Compare plans and upgrade to Pro. Manage subscription details in Settings."
        >
          <BillingView
            profile={profile}
            aiQuota={aiQuota}
            stripeConfigured={isStripeConfigured()}
            proCheckoutEnabled={isProCheckoutEnabled()}
            notice={awaitingConfirmation ? null : notice}
            welcomePro={welcomePro}
            autoRefreshUntilPro={awaitingConfirmation}
          />
        </SectionPage>
      </div>
    </div>
  )
}
