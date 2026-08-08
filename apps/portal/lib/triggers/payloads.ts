import type {
  EmailProvider,
  EmailTriggerPayload,
  ScheduleTriggerPayload,
  WebhookTriggerPayload,
} from "@/lib/triggers/types"

type NormalizedEmailMessage = {
  from: string
  to: string
  subject: string
  body: string
  bodyHtml: string
  messageId: string
  threadId: string
  receivedAt: string
  attachments: unknown[]
}

export function buildEmailPayload(
  normalized: NormalizedEmailMessage,
  provider: EmailProvider
): EmailTriggerPayload {
  return {
    ...normalized,
    triggerType: "email",
    provider,
    triggeredAt: new Date().toISOString(),
  }
}

export function buildWebhookPayload(
  body: unknown,
  operation: string
): WebhookTriggerPayload {
  const base =
    body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : { payload: body }

  return {
    ...base,
    triggeredAt: new Date().toISOString(),
    triggerType: operation || "webhook",
  }
}

export function buildSchedulePayload(input: {
  scheduledFor: string
  triggeredAt: string
  schedule?: unknown
  scheduleSummary?: string
  cron?: string
}): ScheduleTriggerPayload {
  return {
    triggerType: "schedule",
    scheduledFor: input.scheduledFor,
    triggeredAt: input.triggeredAt,
    ...(input.schedule !== undefined ? { schedule: input.schedule } : {}),
    ...(input.scheduleSummary
      ? { scheduleSummary: input.scheduleSummary }
      : {}),
    ...(input.cron ? { cron: input.cron } : {}),
  }
}
