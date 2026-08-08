import { createAdminClient } from "@/utils/supabase/admin"
import { getSecretPayloadForUser } from "@/lib/data/secrets"
import type { OAuthTokenPayload, SecretMetadata } from "@/lib/domain/secret"
import { ensureFreshOAuthToken } from "@/lib/integrations/auth/token-refresh"
import {
  parseGmailWatchExpiry,
  renewGmailWatch,
} from "@/lib/triggers/subscriptions/gmail"
import { renewOutlookSubscription } from "@/lib/triggers/subscriptions/outlook"
import type { RenewResult, TriggerSubscriptionRow } from "@/lib/triggers/types"

const RENEW_WITHIN_MS = 24 * 60 * 60 * 1000

/**
 * Renew Gmail watches / Outlook Graph subscriptions that expire within 24h.
 * Called from POST /api/internal/process-queue.
 */
export async function renewExpiringSubscriptions(
  now: Date = new Date()
): Promise<RenewResult[]> {
  const supabase = createAdminClient()
  const horizon = new Date(now.getTime() + RENEW_WITHIN_MS).toISOString()

  const { data, error } = await supabase
    .from("workflow_trigger_subscriptions")
    .select("*")
    .eq("status", "active")
    .in("provider", ["gmail", "outlook"])
    .eq("operation", "receive")
    .not("expires_at", "is", null)
    .lte("expires_at", horizon)

  if (error || !data) {
    return []
  }

  const results: RenewResult[] = []

  for (const row of data as TriggerSubscriptionRow[]) {
    const secretName = String(row.metadata?.secretName ?? "")
    if (!secretName) {
      results.push({
        subscriptionId: row.id,
        provider: row.provider,
        status: "skipped",
        error: "Missing secretName in metadata.",
      })
      continue
    }

    try {
      const secret = await getSecretPayloadForUser(
        supabase,
        row.user_id,
        secretName
      )
      if (!secret) {
        results.push({
          subscriptionId: row.id,
          provider: row.provider,
          status: "failed",
          error: "Secret not found.",
        })
        continue
      }

      const tokens = await ensureFreshOAuthToken({
        provider: row.provider as "gmail" | "outlook",
        payload: secret.payload as OAuthTokenPayload,
        secretId: secret.rowId,
        metadata: secret.secret.metadata as SecretMetadata,
        admin: { supabase, userId: row.user_id },
      })

      if (row.provider === "gmail") {
        const topic = process.env.GMAIL_PUBSUB_TOPIC
        if (!topic) {
          results.push({
            subscriptionId: row.id,
            provider: row.provider,
            status: "skipped",
            error: "GMAIL_PUBSUB_TOPIC not set.",
          })
          continue
        }

        const watch = await renewGmailWatch(tokens.accessToken, topic)
        const parsed = parseGmailWatchExpiry(watch)

        await supabase
          .from("workflow_trigger_subscriptions")
          .update({
            subscription_ref: parsed.subscriptionRef,
            last_history_id:
              parsed.lastHistoryId ?? row.last_history_id,
            expires_at: parsed.expiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id)

        results.push({
          subscriptionId: row.id,
          provider: row.provider,
          status: "renewed",
        })
        continue
      }

      if (row.provider === "outlook") {
        const clientState =
          typeof row.metadata?.clientState === "string" &&
          row.metadata.clientState
            ? row.metadata.clientState
            : crypto.randomUUID()

        const sub = await renewOutlookSubscription(
          tokens.accessToken,
          clientState,
          row.subscription_ref
        )

        await supabase
          .from("workflow_trigger_subscriptions")
          .update({
            subscription_ref: sub.id,
            expires_at: sub.expirationDateTime,
            metadata: {
              ...(row.metadata ?? {}),
              clientState,
              secretName,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.id)

        results.push({
          subscriptionId: row.id,
          provider: row.provider,
          status: "renewed",
        })
      }
    } catch (error) {
      results.push({
        subscriptionId: row.id,
        provider: row.provider,
        status: "failed",
        error:
          error instanceof Error ? error.message : "Renewal failed.",
      })
    }
  }

  return results
}
