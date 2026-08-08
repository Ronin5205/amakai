import type { OutlookSubscriptionResult } from "@/lib/triggers/types"

const OUTLOOK_SUBSCRIPTION_TTL_MS = 2 * 24 * 60 * 60 * 1000

export function outlookNotificationUrl(): string {
  const base =
    process.env.NEXT_PUBLIC_PORTAL_URL ?? "http://localhost:3001"
  return `${base.replace(/\/$/, "")}/api/integrations/outlook/webhook`
}

export async function registerOutlookSubscription(
  accessToken: string,
  notificationUrl: string,
  clientState: string
): Promise<OutlookSubscriptionResult> {
  const expirationDateTime = new Date(
    Date.now() + OUTLOOK_SUBSCRIPTION_TTL_MS
  ).toISOString()

  const response = await fetch(
    "https://graph.microsoft.com/v1.0/subscriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        changeType: "created",
        notificationUrl,
        resource: "me/mailFolders('Inbox')/messages",
        expirationDateTime,
        clientState,
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Outlook subscription failed: ${text}`)
  }

  return (await response.json()) as OutlookSubscriptionResult
}

/**
 * Renew by creating a replacement Graph subscription
 * (PATCH has a shorter max lifetime; recreate is simpler and reliable).
 */
export async function renewOutlookSubscription(
  accessToken: string,
  clientState: string,
  previousSubscriptionId?: string | null
): Promise<OutlookSubscriptionResult> {
  const notificationUrl = outlookNotificationUrl()

  if (previousSubscriptionId) {
    try {
      await fetch(
        `https://graph.microsoft.com/v1.0/subscriptions/${previousSubscriptionId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )
    } catch {
      // Best-effort cleanup of the old subscription.
    }
  }

  return registerOutlookSubscription(accessToken, notificationUrl, clientState)
}
