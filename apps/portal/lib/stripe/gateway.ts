/**
 * Stripe Gateway — the ONLY module allowed to import the Stripe SDK or hold
 * secret keys. All Checkout, Customer Portal, webhook, and reconcile flows
 * must go through this file. Do not import `stripe` elsewhere.
 */
import "server-only"

import Stripe from "stripe"
import { portalUrl } from "@amakai/shared/lib/site-config"

import {
  applyVerifiedEntitlement,
  applyVerifiedEntitlementForUser,
  claimStripeWebhookEvent,
  getInternalBillingRecordForUser,
  markStripeWebhookFailed,
  markStripeWebhookProcessed,
  touchBillingActionTimestamp,
  upsertEncryptedStripeCustomer,
} from "@/lib/data/billing"
import { planFromVerifiedSubscription } from "@/lib/domain/billing"
import { createClient } from "@/utils/supabase/server"

const BILLING_ACTION_COOLDOWN_MS = 5_000
const CHECKOUT_SESSION_ID_RE = /^cs_[\w]+$/

let stripeClient: Stripe | null = null

function requireEnv(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing ${name}.`)
  }
  return value
}

function getSecretKey(): string {
  return requireEnv("STRIPE_SECRET_KEY")
}

function getWebhookSecret(): string {
  return requireEnv("STRIPE_WEBHOOK_SECRET")
}

function getProPriceId(): string | null {
  return process.env.STRIPE_PRO_PRICE_ID?.trim() || null
}

/** Safe public status — never leaks secrets. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

export function isProCheckoutEnabled(): boolean {
  return isStripeConfigured() && Boolean(getProPriceId())
}

function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(getSecretKey(), {
      // Pin app info for audit trails in Stripe Dashboard.
      appInfo: {
        name: "Amakai Portal",
        version: "0.1.0",
      },
      maxNetworkRetries: 2,
      timeout: 20_000,
    })
  }
  return stripeClient
}

async function requireAuthenticatedUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error("Sign in to manage billing.")
  }

  return user
}

async function enforceBillingActionRateLimit(userId: string) {
  const record = await getInternalBillingRecordForUser(userId)
  if (record?.lastBillingActionAt) {
    const elapsed =
      Date.now() - new Date(record.lastBillingActionAt).getTime()
    if (elapsed >= 0 && elapsed < BILLING_ACTION_COOLDOWN_MS) {
      throw new Error("Please wait a moment before trying again.")
    }
  }
  await touchBillingActionTimestamp(userId)
}

function customerIdOf(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null | undefined
): string | null {
  if (!customer) return null
  return typeof customer === "string" ? customer : customer.id
}

function subscriptionPriceIds(subscription: Stripe.Subscription): string[] {
  return subscription.items.data
    .map((item) => item.price?.id)
    .filter((id): id is string => Boolean(id))
}

/**
 * Grants Pro only when Stripe reports an active/trialing subscription that
 * includes our configured Pro price. Wrong-price or unpaid subs stay Free.
 * Cancel-at-period-end keeps Pro until the period ends, but is stored for UI.
 */
async function syncEntitlementFromSubscription(
  subscription: Stripe.Subscription,
  options?: { userId?: string }
) {
  const stripeCustomerId = customerIdOf(subscription.customer)
  if (!stripeCustomerId) {
    throw new Error("Subscription missing customer.")
  }

  const plan = planFromVerifiedSubscription({
    status: subscription.status,
    priceIds: subscriptionPriceIds(subscription),
    expectedProPriceId: getProPriceId(),
  })

  // Stripe API moved period bounds onto subscription items.
  const periodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => typeof value === "number")
  const currentPeriodEndUnix =
    periodEnds.length > 0 ? Math.max(...periodEnds) : null

  // Scheduled cancellation still has status=active; also treat cancel_at as canceling.
  const cancelAtPeriodEnd =
    Boolean(subscription.cancel_at_period_end) ||
    (typeof subscription.cancel_at === "number" &&
      (subscription.status === "active" || subscription.status === "trialing"))

  const payload = {
    stripeCustomerId,
    stripeSubscriptionId: subscription.id,
    stripeSubscriptionStatus: subscription.status,
    cancelAtPeriodEnd,
    currentPeriodEnd: currentPeriodEndUnix
      ? new Date(currentPeriodEndUnix * 1000).toISOString()
      : typeof subscription.cancel_at === "number"
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
    plan,
  }

  const userId =
    options?.userId ??
    (typeof subscription.metadata?.supabase_user_id === "string"
      ? subscription.metadata.supabase_user_id
      : null)

  if (userId) {
    await applyVerifiedEntitlementForUser(userId, payload)
    return
  }

  await applyVerifiedEntitlement(payload)
}

async function resolveSubscriptionForUser(input: {
  stripe: Stripe
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
}): Promise<Stripe.Subscription | null> {
  const { stripe, stripeCustomerId, stripeSubscriptionId } = input

  if (stripeSubscriptionId) {
    try {
      return await stripe.subscriptions.retrieve(stripeSubscriptionId)
    } catch {
      // Fall through to customer listing.
    }
  }

  if (!stripeCustomerId) {
    return null
  }

  const listed = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 10,
  })

  // Prefer a still-usable Pro subscription (active/trialing), then any recent one.
  const preferred =
    listed.data.find(
      (sub) => sub.status === "active" || sub.status === "trialing"
    ) ?? listed.data[0]

  return preferred ?? null
}

async function ensureStripeCustomerForUser(user: {
  id: string
  email?: string | null
}): Promise<string> {
  if (!isStripeConfigured()) {
    throw new Error("Stripe is not configured.")
  }

  const existing = await getInternalBillingRecordForUser(user.id)
  if (existing?.stripeCustomerId) {
    // Verify the customer still exists / belongs to this user in Stripe.
    const stripe = getStripeClient()
    const customer = await stripe.customers.retrieve(existing.stripeCustomerId)
    if (customer.deleted) {
      throw new Error("Stripe customer was deleted. Contact support.")
    }
    const linkedUserId = customer.metadata?.supabase_user_id
    if (linkedUserId && linkedUserId !== user.id) {
      throw new Error("Stripe customer ownership mismatch.")
    }
    return existing.stripeCustomerId
  }

  const stripe = getStripeClient()
  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    metadata: {
      supabase_user_id: user.id,
    },
  })

  await upsertEncryptedStripeCustomer({
    userId: user.id,
    stripeCustomerId: customer.id,
  })

  return customer.id
}

/** Opens Stripe Customer Portal (payment methods + billing address). */
export async function openBillingPortalSession(): Promise<{ url: string }> {
  const user = await requireAuthenticatedUser()
  await enforceBillingActionRateLimit(user.id)

  const customerId = await ensureStripeCustomerForUser(user)
  const stripe = getStripeClient()

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${portalUrl}/settings`,
  })

  if (!session.url) {
    throw new Error("Stripe did not return a billing portal URL.")
  }

  return { url: session.url }
}

/**
 * Starts Pro Checkout. Price ID is server-only — clients cannot choose amounts.
 * Disabled until STRIPE_PRO_PRICE_ID is set.
 */
export async function startProCheckoutSession(): Promise<{ url: string }> {
  if (!isProCheckoutEnabled()) {
    throw new Error("Pro checkout is not available.")
  }

  const priceId = getProPriceId()
  if (!priceId) {
    throw new Error("Pro checkout is not available.")
  }

  const user = await requireAuthenticatedUser()
  await enforceBillingActionRateLimit(user.id)

  const customerId = await ensureStripeCustomerForUser(user)
  const stripe = getStripeClient()

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    // Allow promotion codes only from Stripe Dashboard config — not client-supplied.
    success_url: `${portalUrl}/admin/billing?session_id={CHECKOUT_SESSION_ID}&welcome=pro`,
    cancel_url: `${portalUrl}/admin/billing?checkout=cancelled`,
    metadata: {
      supabase_user_id: user.id,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
      },
    },
  })

  if (!session.url) {
    throw new Error("Stripe did not return a checkout URL.")
  }

  return { url: session.url }
}

/**
 * Reconciles a Checkout return without trusting the browser.
 * Fetches the session from Stripe, verifies ownership + payment, then applies
 * the same entitlement rules as webhooks (idempotent with webhooks).
 */
export async function reconcileCheckoutSession(sessionId: string): Promise<{
  status: "synced" | "pending" | "cancelled" | "ignored"
}> {
  if (!CHECKOUT_SESSION_ID_RE.test(sessionId)) {
    throw new Error("Invalid checkout session.")
  }

  const user = await requireAuthenticatedUser()
  const stripe = getStripeClient()
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  })

  const sessionUserId =
    session.client_reference_id ?? session.metadata?.supabase_user_id ?? null

  if (!sessionUserId || sessionUserId !== user.id) {
    throw new Error("Checkout session does not belong to this account.")
  }

  const customerId = customerIdOf(session.customer)
  const record = await getInternalBillingRecordForUser(user.id)
  if (
    customerId &&
    record?.stripeCustomerId &&
    customerId !== record.stripeCustomerId
  ) {
    throw new Error("Checkout customer mismatch.")
  }

  if (session.status === "expired" || session.status === "open") {
    return { status: session.status === "open" ? "pending" : "cancelled" }
  }

  if (session.mode !== "subscription") {
    return { status: "ignored" }
  }

  // Only sync entitlements when Stripe confirms payment — prevents free upgrades.
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return { status: "pending" }
  }

  let subscription: Stripe.Subscription | null = null
  if (typeof session.subscription === "string") {
    subscription = await stripe.subscriptions.retrieve(session.subscription)
  } else if (session.subscription && !("deleted" in session.subscription)) {
    subscription = session.subscription
  }

  if (!subscription) {
    return { status: "pending" }
  }

  await syncEntitlementFromSubscription(subscription)
  return { status: "synced" }
}

async function handleVerifiedStripeEvent(event: Stripe.Event): Promise<void> {
  const stripe = getStripeClient()

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode !== "subscription" || !session.subscription) {
        return
      }
      if (
        session.payment_status !== "paid" &&
        session.payment_status !== "no_payment_required"
      ) {
        return
      }

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      await syncEntitlementFromSubscription(subscription)
      return
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      await syncEntitlementFromSubscription(
        event.data.object as Stripe.Subscription
      )
      return
    }
    case "invoice.paid":
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice & {
        subscription?: string | Stripe.Subscription | null
      }
      const subscriptionRef =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription && typeof invoice.subscription === "object"
            ? invoice.subscription.id
            : null
      if (!subscriptionRef) {
        return
      }
      const subscription = await stripe.subscriptions.retrieve(subscriptionRef)
      await syncEntitlementFromSubscription(subscription)
      return
    }
    default:
      return
  }
}

/**
 * Webhook entry — signature verification is mandatory in every environment
 * (including local/dev). Never skip constructEvent.
 */
export async function processStripeWebhook(input: {
  rawBody: string
  signatureHeader: string | null
}): Promise<{ ok: true } | { ok: false; retryable: boolean; error: string }> {
  if (!input.signatureHeader) {
    return {
      ok: false,
      retryable: false,
      error: "Missing stripe-signature header.",
    }
  }

  let event: Stripe.Event
  try {
    event = getStripeClient().webhooks.constructEvent(
      input.rawBody,
      input.signatureHeader,
      getWebhookSecret()
    )
  } catch {
    return {
      ok: false,
      retryable: false,
      error: "Invalid Stripe webhook signature.",
    }
  }

  const claim = await claimStripeWebhookEvent(event.id, event.type)

  if (claim.status === "already_processed") {
    return { ok: true }
  }

  if (claim.status === "in_progress") {
    // Another worker is handling it — ask Stripe to retry shortly.
    return {
      ok: false,
      retryable: true,
      error: "Webhook event is already being processed.",
    }
  }

  try {
    await handleVerifiedStripeEvent(event)
    await markStripeWebhookProcessed(event.id)
    return { ok: true }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook processing failed."
    await markStripeWebhookFailed(event.id, message)
    // Non-ok + retryable so Stripe retries → avoids paid-but-not-upgraded.
    return { ok: false, retryable: true, error: message }
  }
}

/**
 * Pulls the latest subscription from Stripe for the signed-in user.
 * Keeps cancel-at-period-end / period end accurate even if a webhook was delayed.
 */
export async function refreshCurrentUserSubscriptionFromStripe(): Promise<void> {
  if (!isStripeConfigured()) {
    return
  }

  const user = await requireAuthenticatedUser()
  const record = await getInternalBillingRecordForUser(user.id)
  if (!record?.stripeCustomerId && !record?.stripeSubscriptionId) {
    return
  }

  const stripe = getStripeClient()
  const subscription = await resolveSubscriptionForUser({
    stripe,
    stripeCustomerId: record.stripeCustomerId,
    stripeSubscriptionId: record.stripeSubscriptionId,
  })

  if (!subscription) {
    return
  }

  await syncEntitlementFromSubscription(subscription, { userId: user.id })
}
