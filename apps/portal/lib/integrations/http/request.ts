import type {
  IntegrationExecuteContext,
  IntegrationExecuteResult,
} from "@/lib/integrations/registry/types"
import { resolveConfiguredValue } from "@/lib/integrations/registry/email-operations"
import { getSecretByName } from "@/lib/data/secrets"
import type { ApiKeyPayload, WebhookSigningPayload } from "@/lib/domain/secret"

function resolveUrl(ctx: IntegrationExecuteContext) {
  return (
    resolveConfiguredValue(ctx.payload, ctx.node.config, "urlField") ||
    String(ctx.node.config.urlText ?? "").trim()
  )
}

function resolveBody(ctx: IntegrationExecuteContext) {
  const fromField = resolveConfiguredValue(
    ctx.payload,
    ctx.node.config,
    "bodyField"
  )
  if (fromField) {
    return fromField
  }
  const text = ctx.node.config.bodyText
  if (typeof text === "string" && text.trim()) {
    return text
  }
  return JSON.stringify(ctx.payload)
}

function parseHeaders(raw: unknown): Record<string, string> {
  if (typeof raw !== "string" || !raw.trim()) {
    return {}
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const headers: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" || typeof value === "number") {
        headers[key] = String(value)
      }
    }
    return headers
  } catch {
    return {}
  }
}

async function resolveAuthHeaders(
  ctx: IntegrationExecuteContext
): Promise<Record<string, string>> {
  const authMode = String(ctx.node.config.authMode ?? "secret")
  if (authMode === "none") {
    return {}
  }

  if (authMode === "public") {
    const key = String(ctx.node.config.publicApiKey ?? "").trim()
    if (!key) {
      return {}
    }
    return { Authorization: key.startsWith("Bearer ") ? key : `Bearer ${key}` }
  }

  const secretName = String(ctx.node.config.secretName ?? "").trim()
  if (!secretName) {
    return {}
  }

  const secret = await getSecretByName(secretName)
  if (!secret) {
    throw new Error(`Secret "${secretName}" was not found.`)
  }

  const payload = secret.payload as ApiKeyPayload & WebhookSigningPayload
  if ("secret" in payload && typeof payload.secret === "string") {
    return { "X-Webhook-Secret": payload.secret }
  }

  const apiKey = typeof payload.apiKey === "string" ? payload.apiKey : ""
  if (!apiKey) {
    return {}
  }

  const headerName =
    typeof payload.headerName === "string" && payload.headerName.trim()
      ? payload.headerName
      : "Authorization"

  if (headerName.toLowerCase() === "authorization") {
    return {
      Authorization: apiKey.startsWith("Bearer ") ? apiKey : `Bearer ${apiKey}`,
    }
  }

  return { [headerName]: apiKey }
}

export async function executeHttpRequestProduction(
  ctx: IntegrationExecuteContext
): Promise<IntegrationExecuteResult> {
  try {
    const method = String(ctx.node.config.method ?? "GET").toUpperCase()
    const url = resolveUrl(ctx)
    if (!url) {
      return { ok: false, message: "HTTP request URL is empty." }
    }

    const timeoutMs = Math.max(
      1000,
      Math.min(60_000, Number(ctx.node.config.timeoutMs ?? 15_000))
    )

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...parseHeaders(ctx.node.config.headersJson),
      ...(await resolveAuthHeaders(ctx)),
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    const init: RequestInit = {
      method,
      headers,
      signal: controller.signal,
    }

    if (method !== "GET" && method !== "HEAD") {
      init.body = resolveBody(ctx)
    }

    const response = await fetch(url, init)
    clearTimeout(timer)

    const contentType = response.headers.get("content-type") ?? ""
    let httpBody: unknown
    if (contentType.includes("application/json")) {
      httpBody = await response.json()
    } else {
      httpBody = await response.text()
    }

    return {
      ok: response.ok,
      payload: {
        ...ctx.payload,
        httpStatus: response.status,
        httpOk: response.ok,
        httpBody,
      },
      message: response.ok
        ? `HTTP ${method} ${response.status}`
        : `HTTP ${method} failed with status ${response.status}`,
    }
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "HTTP request failed unexpectedly.",
    }
  }
}
