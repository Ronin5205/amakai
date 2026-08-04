import "server-only"

import type { BillingProfile, PlanTier } from "@/lib/domain/billing"
import {
  decryptStripeId,
  encryptStripeId,
  hashStripeId,
} from "@/lib/stripe/crypto"
import { createAdminClient } from "@/utils/supabase/admin"
import { createClient } from "@/utils/supabase/server"

type BillingProfileRow = {
  user_id: string
  plan: string
  stripe_customer_id: string | null
  stripe_customer_id_hash: string | null
  stripe_customer_id_enc: string | null
  stripe_subscription_id: string | null
  stripe_subscription_id_enc: string | null
  stripe_subscription_status: string | null
  cancel_at_period_end: boolean | null
  current_period_end: string | null
  last_billing_action_at: string | null
  updated_at: string
}

export type InternalBillingRecord = {
  userId: string
  plan: PlanTier
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  stripeSubscriptionStatus: string | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  lastBillingActionAt: string | null
  updatedAt: string
}

const BILLING_SELECT =
  "user_id, plan, stripe_customer_id, stripe_customer_id_hash, stripe_customer_id_enc, stripe_subscription_id, stripe_subscription_id_enc, stripe_subscription_status, cancel_at_period_end, current_period_end, last_billing_action_at, updated_at"

function isPlanTier(value: string): value is PlanTier {
  return value === "free" || value === "pro"
}

function resolveCustomerId(row: BillingProfileRow): string | null {
  if (row.stripe_customer_id_enc) {
    try {
      return decryptStripeId(row.stripe_customer_id_enc)
    } catch {
      // Fall through to legacy plaintext during migration.
    }
  }
  return row.stripe_customer_id
}

function resolveSubscriptionId(row: BillingProfileRow): string | null {
  if (row.stripe_subscription_id_enc) {
    try {
      return decryptStripeId(row.stripe_subscription_id_enc)
    } catch {
      // Fall through to legacy plaintext during migration.
    }
  }
  return row.stripe_subscription_id
}

function mapInternal(row: BillingProfileRow): InternalBillingRecord {
  return {
    userId: row.user_id,
    plan: isPlanTier(row.plan) ? row.plan : "free",
    stripeCustomerId: resolveCustomerId(row),
    stripeSubscriptionId: resolveSubscriptionId(row),
    stripeSubscriptionStatus: row.stripe_subscription_status,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    currentPeriodEnd: row.current_period_end,
    lastBillingActionAt: row.last_billing_action_at,
    updatedAt: row.updated_at,
  }
}

function toPublicProfile(record: InternalBillingRecord | null): BillingProfile {
  if (!record) {
    return {
      plan: "free",
      hasStripeCustomer: false,
      subscriptionStatus: null,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      updatedAt: null,
    }
  }

  return {
    plan: record.plan,
    hasStripeCustomer: Boolean(record.stripeCustomerId),
    subscriptionStatus: record.stripeSubscriptionStatus,
    cancelAtPeriodEnd: record.cancelAtPeriodEnd,
    currentPeriodEnd: record.currentPeriodEnd,
    updatedAt: record.updatedAt,
  }
}

async function getAuthenticatedUserId() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return { userId: user.id, email: user.email ?? null }
}

/** Public read — never returns raw Stripe IDs to callers. */
export async function getBillingProfile(): Promise<BillingProfile | null> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return null
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("user_billing_profiles")
    .select(BILLING_SELECT)
    .eq("user_id", auth.userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message ?? "Failed to load billing profile.")
  }

  if (!data) {
    return toPublicProfile(null)
  }

  return toPublicProfile(mapInternal(data as BillingProfileRow))
}

export async function getBillingProfileForUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<BillingProfile> {
  const { data, error } = await supabase
    .from("user_billing_profiles")
    .select(BILLING_SELECT)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message ?? "Failed to load billing profile.")
  }

  if (!data) {
    return toPublicProfile(null)
  }

  return toPublicProfile(mapInternal(data as BillingProfileRow))
}

export async function getUserPlan(): Promise<PlanTier> {
  const profile = await getBillingProfile()
  return profile?.plan ?? "free"
}

/** Service-role read used only by the Stripe gateway. */
export async function getInternalBillingRecordForUser(
  userId: string
): Promise<InternalBillingRecord | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("user_billing_profiles")
    .select(BILLING_SELECT)
    .eq("user_id", userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message ?? "Failed to load billing record.")
  }

  return data ? mapInternal(data as BillingProfileRow) : null
}

export async function getInternalBillingRecordByCustomerId(
  stripeCustomerId: string
): Promise<InternalBillingRecord | null> {
  const admin = createAdminClient()
  const customerHash = hashStripeId(stripeCustomerId)

  const { data, error } = await admin
    .from("user_billing_profiles")
    .select(BILLING_SELECT)
    .eq("stripe_customer_id_hash", customerHash)
    .maybeSingle()

  if (error) {
    throw new Error(error.message ?? "Failed to look up billing by customer.")
  }

  if (data) {
    return mapInternal(data as BillingProfileRow)
  }

  // Legacy plaintext fallback during migration.
  const { data: legacy, error: legacyError } = await admin
    .from("user_billing_profiles")
    .select(BILLING_SELECT)
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle()

  if (legacyError) {
    throw new Error(legacyError.message ?? "Failed to look up legacy billing.")
  }

  return legacy ? mapInternal(legacy as BillingProfileRow) : null
}

export async function upsertEncryptedStripeCustomer(input: {
  userId: string
  stripeCustomerId: string
}): Promise<InternalBillingRecord> {
  const admin = createAdminClient()
  const existing = await getInternalBillingRecordForUser(input.userId)

  const { data, error } = await admin
    .from("user_billing_profiles")
    .upsert(
      {
        user_id: input.userId,
        plan: existing?.plan ?? "free",
        stripe_customer_id: null,
        stripe_customer_id_hash: hashStripeId(input.stripeCustomerId),
        stripe_customer_id_enc: encryptStripeId(input.stripeCustomerId),
        stripe_subscription_id: null,
        stripe_subscription_id_enc: existing?.stripeSubscriptionId
          ? encryptStripeId(existing.stripeSubscriptionId)
          : null,
        stripe_subscription_status: existing?.stripeSubscriptionStatus ?? null,
        cancel_at_period_end: existing?.cancelAtPeriodEnd ?? false,
        current_period_end: existing?.currentPeriodEnd ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select(BILLING_SELECT)
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save Stripe customer linkage.")
  }

  return mapInternal(data as BillingProfileRow)
}

export type EntitlementSyncInput = {
  stripeCustomerId: string
  stripeSubscriptionId: string | null
  stripeSubscriptionStatus: string | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  plan: PlanTier
}

/**
 * Entitlement writes are service-role only. Call exclusively from the Stripe gateway
 * after signature verification + price/payment checks.
 */
export async function applyVerifiedEntitlementForUser(
  userId: string,
  input: EntitlementSyncInput
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from("user_billing_profiles")
    .upsert(
      {
        user_id: userId,
        plan: input.plan,
        stripe_customer_id: null,
        stripe_customer_id_hash: hashStripeId(input.stripeCustomerId),
        stripe_customer_id_enc: encryptStripeId(input.stripeCustomerId),
        stripe_subscription_id: null,
        stripe_subscription_id_enc: input.stripeSubscriptionId
          ? encryptStripeId(input.stripeSubscriptionId)
          : null,
        stripe_subscription_status: input.stripeSubscriptionStatus,
        cancel_at_period_end: input.cancelAtPeriodEnd,
        current_period_end: input.currentPeriodEnd,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )

  if (error) {
    throw new Error(error.message ?? "Failed to apply billing entitlement.")
  }
}

export async function applyVerifiedEntitlement(
  input: EntitlementSyncInput
): Promise<void> {
  const existing = await getInternalBillingRecordByCustomerId(
    input.stripeCustomerId
  )

  if (!existing) {
    throw new Error(
      `No billing profile linked to Stripe customer ${hashStripeId(input.stripeCustomerId).slice(0, 12)}.`
    )
  }

  await applyVerifiedEntitlementForUser(existing.userId, input)
}

export async function touchBillingActionTimestamp(userId: string): Promise<void> {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const existing = await getInternalBillingRecordForUser(userId)
  if (!existing) {
    const { error } = await admin.from("user_billing_profiles").insert({
      user_id: userId,
      plan: "free",
      last_billing_action_at: now,
      updated_at: now,
    })
    if (error) {
      throw new Error(error.message ?? "Failed to create billing profile.")
    }
    return
  }

  const { error } = await admin
    .from("user_billing_profiles")
    .update({ last_billing_action_at: now })
    .eq("user_id", userId)

  if (error) {
    throw new Error(error.message ?? "Failed to update billing action timestamp.")
  }
}

export type WebhookClaimResult =
  | { status: "claimed" }
  | { status: "already_processed" }
  | { status: "in_progress" }

/** Idempotent claim — Stripe retries are safe. */
export async function claimStripeWebhookEvent(
  eventId: string,
  eventType: string
): Promise<WebhookClaimResult> {
  const admin = createAdminClient()

  const { data: existing, error: readError } = await admin
    .from("stripe_webhook_events")
    .select("processing_status")
    .eq("event_id", eventId)
    .maybeSingle()

  if (readError) {
    throw new Error(readError.message ?? "Failed to read webhook event.")
  }

  if (existing?.processing_status === "processed") {
    return { status: "already_processed" }
  }

  if (existing?.processing_status === "processing") {
    return { status: "in_progress" }
  }

  if (existing?.processing_status === "failed") {
    const { error } = await admin
      .from("stripe_webhook_events")
      .update({
        processing_status: "processing",
        error_message: null,
        event_type: eventType,
      })
      .eq("event_id", eventId)

    if (error) {
      throw new Error(error.message ?? "Failed to reclaim webhook event.")
    }
    return { status: "claimed" }
  }

  const { error } = await admin.from("stripe_webhook_events").insert({
    event_id: eventId,
    event_type: eventType,
    processing_status: "processing",
  })

  if (error) {
    // Unique violation → concurrent claim
    if (error.code === "23505") {
      return { status: "in_progress" }
    }
    throw new Error(error.message ?? "Failed to claim webhook event.")
  }

  return { status: "claimed" }
}

export async function markStripeWebhookProcessed(eventId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from("stripe_webhook_events")
    .update({
      processing_status: "processed",
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq("event_id", eventId)

  if (error) {
    throw new Error(error.message ?? "Failed to mark webhook processed.")
  }
}

export async function markStripeWebhookFailed(
  eventId: string,
  message: string
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from("stripe_webhook_events")
    .update({
      processing_status: "failed",
      error_message: message.slice(0, 500),
      processed_at: new Date().toISOString(),
    })
    .eq("event_id", eventId)

  if (error) {
    throw new Error(error.message ?? "Failed to mark webhook failed.")
  }
}
