"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckIcon, CreditCardIcon, SparkleIcon } from "@phosphor-icons/react"

import {
  createProCheckoutSessionAction,
  refreshBillingStatusAction,
} from "@/lib/actions/billing-actions"
import {
  PLAN_DEFINITIONS,
  formatSubscriptionLabel,
  planDisplayName,
  type BillingProfile,
  type PlanTier,
} from "@/lib/domain/billing"
import { Badge } from "@amakai/shared/components/ui/badge"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@amakai/shared/components/ui/card"

export interface BillingViewProps {
  profile: BillingProfile
  stripeConfigured: boolean
  proCheckoutEnabled: boolean
  notice?: "synced" | "pending" | "cancelled" | null
  welcomePro?: boolean
  /** Quietly poll Stripe until Pro is applied after checkout return. */
  autoRefreshUntilPro?: boolean
}

const PRO_CONFIRM_POLL_MS = 2_000
const PRO_CONFIRM_MAX_ATTEMPTS = 15

function PlanCard({
  planId,
  currentPlan,
  proCheckoutEnabled,
  stripeConfigured,
  isBusy,
  onUpgrade,
}: {
  planId: PlanTier
  currentPlan: PlanTier
  proCheckoutEnabled: boolean
  stripeConfigured: boolean
  isBusy: boolean
  onUpgrade: () => void
}) {
  const plan = PLAN_DEFINITIONS[planId]
  const isCurrent = currentPlan === planId
  const proReady = plan.available && proCheckoutEnabled && stripeConfigured

  return (
    <Card className={isCurrent ? "border-foreground/40" : undefined}>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </div>
          {isCurrent ? <Badge variant="secondary">Current</Badge> : null}
        </div>
        <p className="pt-2 font-heading text-2xl font-medium tracking-tight">
          {plan.priceLabel}
        </p>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col gap-2 text-sm">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {planId === "free" ? (
          <Button variant="outline" disabled className="w-full">
            {isCurrent ? "Your current plan" : "Included"}
          </Button>
        ) : isCurrent ? (
          <Button
            variant="outline"
            className="w-full"
            render={<Link href="/settings#billing" />}
            nativeButton={false}
          >
            Manage in Settings
          </Button>
        ) : (
          <Button
            disabled={!proReady || isBusy}
            className="w-full"
            onClick={onUpgrade}
          >
            {isBusy
              ? "Redirecting…"
              : proReady
                ? "Upgrade to Pro"
                : "Pro unavailable"}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

function noticeMessage(
  notice: BillingViewProps["notice"]
): { tone: "ok" | "error"; text: string } | null {
  switch (notice) {
    case "cancelled":
      return {
        tone: "ok",
        text: "Checkout was cancelled. No charge was made.",
      }
    default:
      return null
  }
}

export function BillingView({
  profile: initialProfile,
  stripeConfigured,
  proCheckoutEnabled,
  notice = null,
  welcomePro = false,
  autoRefreshUntilPro = false,
}: BillingViewProps) {
  const router = useRouter()
  const [profile, setProfile] = React.useState(initialProfile)
  const [error, setError] = React.useState<string | null>(null)
  const [isCheckingOut, setIsCheckingOut] = React.useState(false)
  const [isConfirmingPro, setIsConfirmingPro] = React.useState(
    autoRefreshUntilPro && initialProfile.plan !== "pro"
  )
  const [confirmedPro, setConfirmedPro] = React.useState(
    welcomePro && initialProfile.plan === "pro"
  )

  const showCongrats =
    (welcomePro || confirmedPro) &&
    (confirmedPro || notice === "synced" || profile.plan === "pro")
  const banner =
    showCongrats || isConfirmingPro ? null : noticeMessage(notice)

  React.useEffect(() => {
    setProfile(initialProfile)
    if (initialProfile.plan === "pro" && welcomePro) {
      setConfirmedPro(true)
      setIsConfirmingPro(false)
    }
  }, [initialProfile, welcomePro])

  React.useEffect(() => {
    if (!autoRefreshUntilPro || profile.plan === "pro") {
      return
    }

    let cancelled = false
    let attempts = 0
    setIsConfirmingPro(true)

    const poll = async () => {
      attempts += 1
      const result = await refreshBillingStatusAction()
      if (cancelled) return

      if ("profile" in result && result.profile) {
        setProfile(result.profile)
        if (result.profile.plan === "pro") {
          setConfirmedPro(true)
          setIsConfirmingPro(false)
          // Drop checkout query params so refresh stays clean.
          window.history.replaceState({}, "", "/admin/billing")
          router.refresh()
          return
        }
      }

      if (attempts >= PRO_CONFIRM_MAX_ATTEMPTS) {
        setIsConfirmingPro(false)
        router.refresh()
        return
      }

      window.setTimeout(poll, PRO_CONFIRM_POLL_MS)
    }

    const timer = window.setTimeout(poll, PRO_CONFIRM_POLL_MS)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [autoRefreshUntilPro, profile.plan, router])

  const handleUpgradeToPro = async () => {
    setIsCheckingOut(true)
    setError(null)

    const result = await createProCheckoutSessionAction()

    if ("error" in result) {
      setIsCheckingOut(false)
      setError(result.error)
      return
    }

    window.location.assign(result.url)
  }

  return (
    <div className="flex w-full flex-col gap-8">
      {error ? (
        <p className="rounded-none border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {banner ? (
        <p className="rounded-none border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          {banner.text}
        </p>
      ) : null}

      {isConfirmingPro && !showCongrats ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SparkleIcon className="size-4" />
              Confirming your Pro upgrade
            </CardTitle>
            <CardDescription>
              Payment received. Syncing your plan from Stripe — this usually
              takes a moment.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {showCongrats ? (
        <Card className="border-foreground/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-heading text-2xl tracking-tight">
              <SparkleIcon className="size-5" />
              Congratulations — you&apos;re on Pro
            </CardTitle>
            <CardDescription>
              Payment confirmed. Welcome to Amakai Pro. Manage billing, payment
              methods, or unsubscribe anytime from Settings.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex flex-col gap-2 sm:flex-row">
            <Button render={<Link href="/" />} nativeButton={false}>
              Go to dashboard
            </Button>
            <Button
              variant="outline"
              render={<Link href="/settings#billing" />}
              nativeButton={false}
            >
              Manage billing
            </Button>
          </CardFooter>
        </Card>
      ) : !isConfirmingPro ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCardIcon className="size-4" />
              Current plan
            </CardTitle>
            <CardDescription>
              You are on the {planDisplayName(profile.plan)} plan.
              {profile.plan === "pro"
                ? " Billing details live in Settings."
                : " Upgrade to Pro with Stripe Checkout."}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="font-heading text-xl font-medium tracking-tight">
                {planDisplayName(profile.plan)}
              </span>
              <Badge
                variant={profile.cancelAtPeriodEnd ? "outline" : "secondary"}
              >
                {profile.cancelAtPeriodEnd ? "Until period end" : "Active"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatSubscriptionLabel({
                plan: profile.plan,
                subscriptionStatus: profile.subscriptionStatus,
                cancelAtPeriodEnd: profile.cancelAtPeriodEnd,
                currentPeriodEnd: profile.currentPeriodEnd,
              })}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-heading text-lg font-medium tracking-tight">
            Plans
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose Free or Pro. After upgrading, manage subscription details in
            Settings.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <PlanCard
            planId="free"
            currentPlan={profile.plan}
            proCheckoutEnabled={proCheckoutEnabled}
            stripeConfigured={stripeConfigured}
            isBusy={isCheckingOut || isConfirmingPro}
            onUpgrade={handleUpgradeToPro}
          />
          <PlanCard
            planId="pro"
            currentPlan={profile.plan}
            proCheckoutEnabled={proCheckoutEnabled}
            stripeConfigured={stripeConfigured}
            isBusy={isCheckingOut || isConfirmingPro}
            onUpgrade={handleUpgradeToPro}
          />
        </div>
      </div>
    </div>
  )
}
