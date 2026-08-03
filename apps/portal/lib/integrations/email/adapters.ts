import type {
  IntegrationExecuteContext,
  IntegrationExecuteResult,
} from "@/lib/integrations/registry/types"
import { resolveConfiguredValue } from "@/lib/integrations/registry/email-operations"
import { ensureFreshOAuthToken } from "@/lib/integrations/auth/token-refresh"
import type { OAuthTokenPayload, SecretMetadata } from "@/lib/domain/secret"
import { getSecretByName } from "@/lib/data/secrets"

function readSendFields(ctx: IntegrationExecuteContext) {
  const to = resolveConfiguredValue(ctx.payload, ctx.node.config, "toField")
  const subject =
    resolveConfiguredValue(ctx.payload, ctx.node.config, "subjectField") ||
    String(ctx.node.config.subjectText ?? "")
  const body =
    resolveConfiguredValue(ctx.payload, ctx.node.config, "bodyField") ||
    String(ctx.node.config.bodyText ?? "")
  const cc = resolveConfiguredValue(ctx.payload, ctx.node.config, "ccField")
  const bcc = resolveConfiguredValue(ctx.payload, ctx.node.config, "bccField")
  return { to, subject, body, cc, bcc }
}

async function resolveOAuthSecret(
  secretName: string,
  expectedKind: "oauth_gmail" | "oauth_outlook"
) {
  const secret = await getSecretByName(secretName)
  if (!secret) {
    throw new Error(`Secret "${secretName}" was not found.`)
  }
  if (secret.kind !== expectedKind) {
    throw new Error(
      `Secret "${secretName}" is ${secret.kind}, expected ${expectedKind}.`
    )
  }
  return secret
}

function toBase64Url(raw: string) {
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "")
}

function buildRfc2822Message(input: {
  to: string
  subject: string
  body: string
  cc?: string
  bcc?: string
  from?: string
}) {
  const lines = [
    input.from ? `From: ${input.from}` : null,
    `To: ${input.to}`,
    input.cc ? `Cc: ${input.cc}` : null,
    input.bcc ? `Bcc: ${input.bcc}` : null,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.body,
  ].filter((line): line is string => line !== null)

  return lines.join("\r\n")
}

export async function executeGmailSend(
  ctx: IntegrationExecuteContext
): Promise<IntegrationExecuteResult> {
  try {
    const fields = readSendFields(ctx)
    if (!fields.to) {
      return { ok: false, message: "Recipient (To) resolved to an empty value." }
    }

    const secretName = String(ctx.node.config.secretName ?? "")
    const secret = await resolveOAuthSecret(secretName, "oauth_gmail")
    const tokens = await ensureFreshOAuthToken({
      provider: "gmail",
      payload: secret.payload as OAuthTokenPayload,
      secretId: secret.id,
      metadata: secret.metadata as SecretMetadata,
    })

    const raw = buildRfc2822Message({
      to: fields.to,
      subject: fields.subject,
      body: fields.body,
      cc: fields.cc || undefined,
      bcc: fields.bcc || undefined,
      from: secret.accountEmail,
    })

    const response = await fetch(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ raw: toBase64Url(raw) }),
      }
    )

    if (!response.ok) {
      const text = await response.text()
      return { ok: false, message: `Gmail send failed: ${text}` }
    }

    const json = (await response.json()) as { id?: string; threadId?: string }

    return {
      ok: true,
      payload: {
        ...ctx.payload,
        sent: true,
        provider: "gmail",
        messageId: json.id ?? `gmail-${Date.now()}`,
        threadId: json.threadId,
        to: fields.to,
        subject: fields.subject,
        sentAt: new Date().toISOString(),
      },
      message: `Sent email via Gmail to ${fields.to}`,
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Gmail send failed unexpectedly.",
    }
  }
}

export async function executeOutlookSend(
  ctx: IntegrationExecuteContext
): Promise<IntegrationExecuteResult> {
  try {
    const fields = readSendFields(ctx)
    if (!fields.to) {
      return { ok: false, message: "Recipient (To) resolved to an empty value." }
    }

    const secretName = String(ctx.node.config.secretName ?? "")
    const secret = await resolveOAuthSecret(secretName, "oauth_outlook")
    const tokens = await ensureFreshOAuthToken({
      provider: "outlook",
      payload: secret.payload as OAuthTokenPayload,
      secretId: secret.id,
      metadata: secret.metadata as SecretMetadata,
    })

    const toRecipients = fields.to.split(",").map((address) => ({
      emailAddress: { address: address.trim() },
    }))

    const message: Record<string, unknown> = {
      subject: fields.subject,
      body: {
        contentType: "Text",
        content: fields.body,
      },
      toRecipients,
    }

    if (fields.cc) {
      message.ccRecipients = fields.cc.split(",").map((address) => ({
        emailAddress: { address: address.trim() },
      }))
    }
    if (fields.bcc) {
      message.bccRecipients = fields.bcc.split(",").map((address) => ({
        emailAddress: { address: address.trim() },
      }))
    }

    const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, saveToSentItems: true }),
    })

    if (!response.ok) {
      const text = await response.text()
      return { ok: false, message: `Outlook send failed: ${text}` }
    }

    return {
      ok: true,
      payload: {
        ...ctx.payload,
        sent: true,
        provider: "outlook",
        messageId: `outlook-${Date.now()}`,
        to: fields.to,
        subject: fields.subject,
        sentAt: new Date().toISOString(),
      },
      message: `Sent email via Outlook to ${fields.to}`,
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Outlook send failed unexpectedly.",
    }
  }
}

export async function normalizeGmailMessage(message: {
  id?: string
  threadId?: string
  payload?: {
    headers?: Array<{ name: string; value: string }>
    body?: { data?: string }
    parts?: Array<{ mimeType?: string; body?: { data?: string } }>
  }
  internalDate?: string
}) {
  const headers = message.payload?.headers ?? []
  const getHeader = (name: string) =>
    headers.find((header) => header.name.toLowerCase() === name.toLowerCase())
      ?.value ?? ""

  const decode = (data?: string) => {
    if (!data) {
      return ""
    }
    return Buffer.from(
      data.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8")
  }

  let body = decode(message.payload?.body?.data)
  let bodyHtml = ""
  for (const part of message.payload?.parts ?? []) {
    if (part.mimeType === "text/plain" && !body) {
      body = decode(part.body?.data)
    }
    if (part.mimeType === "text/html") {
      bodyHtml = decode(part.body?.data)
    }
  }

  return {
    from: getHeader("From"),
    to: getHeader("To"),
    subject: getHeader("Subject"),
    body,
    bodyHtml,
    messageId: message.id ?? getHeader("Message-ID"),
    threadId: message.threadId ?? "",
    receivedAt: message.internalDate
      ? new Date(Number(message.internalDate)).toISOString()
      : new Date().toISOString(),
    attachments: [] as unknown[],
  }
}

export async function normalizeOutlookMessage(message: {
  id?: string
  conversationId?: string
  subject?: string
  bodyPreview?: string
  body?: { contentType?: string; content?: string }
  from?: { emailAddress?: { address?: string } }
  toRecipients?: Array<{ emailAddress?: { address?: string } }>
  receivedDateTime?: string
}) {
  const bodyContent = message.body?.content ?? message.bodyPreview ?? ""
  const isHtml = message.body?.contentType?.toLowerCase() === "html"

  return {
    from: message.from?.emailAddress?.address ?? "",
    to: (message.toRecipients ?? [])
      .map((recipient) => recipient.emailAddress?.address ?? "")
      .filter(Boolean)
      .join(", "),
    subject: message.subject ?? "",
    body: isHtml ? message.bodyPreview ?? "" : bodyContent,
    bodyHtml: isHtml ? bodyContent : "",
    messageId: message.id ?? "",
    threadId: message.conversationId ?? "",
    receivedAt: message.receivedDateTime ?? new Date().toISOString(),
    attachments: [] as unknown[],
  }
}
