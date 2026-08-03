import type {
  IntegrationExecuteContext,
  IntegrationExecuteResult,
  IntegrationOperation,
  IntegrationProvider,
  IntegrationService,
  IntegrationValidationResult,
} from "@/lib/integrations/registry/types"
import type { ConfigSchemaField } from "@/lib/domain/workflow"
import {
  createEmailReceiveOperation,
  createEmailSendOperation,
} from "@/lib/integrations/registry/email-operations"

/**
 * Client-safe production stubs. Real network I/O lives in
 * `registry/server-runtime.ts` and is injected by server runners only —
 * never import adapters/secrets from this module (it is used by the editor).
 */
async function productionUsesPlaygroundStub(
  ctx: IntegrationExecuteContext,
  operation: IntegrationOperation
): Promise<IntegrationExecuteResult> {
  return operation.executePlayground({ ...ctx, mode: "playground" })
}

async function productionReceivePassthrough(
  ctx: IntegrationExecuteContext
): Promise<IntegrationExecuteResult> {
  if (Object.keys(ctx.payload).length > 0) {
    return {
      ok: true,
      payload: {
        ...ctx.payload,
        triggerType: "email",
        provider: String(ctx.node.config.provider ?? ""),
        triggeredAt: new Date().toISOString(),
      },
      message: "Email receive trigger",
    }
  }

  const receive = createEmailReceiveOperation(
    (ctx.node.config.provider as "gmail" | "outlook") ?? "gmail",
    [],
    productionReceivePassthrough
  )
  return receive.executePlayground(ctx)
}

function validateHttpRequest(
  config: Record<string, unknown>
): IntegrationValidationResult {
  const method = String(config.method ?? "GET").toUpperCase()
  if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return { ok: false, message: "Invalid HTTP method." }
  }
  const url =
    (typeof config.urlField === "string" && config.urlField.trim()) ||
    (typeof config.urlText === "string" && config.urlText.trim())
  if (!url) {
    return { ok: false, message: "Provide a URL field or URL text." }
  }
  const authMode = config.authMode === "public" ? "public" : "secret"
  if (authMode === "secret" && !String(config.secretName ?? "").trim()) {
    return { ok: false, message: "Select a secret or switch to Public credentials." }
  }
  return { ok: true }
}

const httpRequestFields: ConfigSchemaField[] = [
  {
    key: "method",
    label: "Method",
    type: "select",
    options: [
      { label: "GET", value: "GET" },
      { label: "POST", value: "POST" },
      { label: "PUT", value: "PUT" },
      { label: "PATCH", value: "PATCH" },
      { label: "DELETE", value: "DELETE" },
    ],
    defaultValue: "GET",
  },
  {
    key: "urlField",
    label: "URL field",
    type: "upstream-field",
    description: "Upstream field containing the request URL.",
  },
  {
    key: "urlText",
    label: "URL",
    type: "string",
    placeholder: "https://api.example.com/v1/…",
  },
  {
    key: "authMode",
    label: "Credentials",
    type: "select",
    options: [
      { label: "Secret (Resources)", value: "secret" },
      { label: "Public (inline)", value: "public" },
      { label: "None", value: "none" },
    ],
    defaultValue: "secret",
  },
  {
    key: "secretName",
    label: "Secret",
    type: "secret-select",
    secretKinds: ["api_key", "bearer_token", "webhook_signing"],
  },
  {
    key: "publicApiKey",
    label: "Public API key / bearer",
    type: "string",
    description: "Used when Credentials is Public.",
  },
  {
    key: "headersJson",
    label: "Headers (JSON)",
    type: "textarea",
    placeholder: '{ "Accept": "application/json" }',
  },
  {
    key: "bodyField",
    label: "Body field",
    type: "upstream-field",
  },
  {
    key: "bodyText",
    label: "Body text",
    type: "textarea",
  },
  {
    key: "timeoutMs",
    label: "Timeout (ms)",
    type: "number",
    defaultValue: 15000,
  },
]

async function executeHttpRequestPlayground(
  ctx: IntegrationExecuteContext
): Promise<IntegrationExecuteResult> {
  const validation = validateHttpRequest(ctx.node.config)
  if (!validation.ok) {
    return validation
  }

  return {
    ok: true,
    payload: {
      ...ctx.payload,
      httpStatus: 200,
      httpOk: true,
      httpBody: { simulated: true },
      lastAction: "HTTP Request (playground)",
    },
    message: "Simulated HTTP request",
  }
}

const httpRequestOperation: IntegrationOperation = {
  id: "request",
  label: "Request",
  description: "Call an external HTTP API",
  nodeKind: "sequential",
  getConfigFields: () => httpRequestFields,
  validate: validateHttpRequest,
  executePlayground: executeHttpRequestPlayground,
  executeProduction: (ctx) =>
    productionUsesPlaygroundStub(ctx, httpRequestOperation),
}

const restProvider: IntegrationProvider = {
  id: "rest",
  label: "REST",
  description: "Generic REST / HTTP APIs",
  supportedAuth: ["api_key", "none"],
  secretKinds: ["api_key", "bearer_token", "webhook_signing"],
  operations: [httpRequestOperation],
}

function createGmailSend(): IntegrationOperation {
  const op = createEmailSendOperation("gmail", ["oauth_gmail"], (ctx) =>
    productionUsesPlaygroundStub(ctx, op)
  )
  return op
}

function createOutlookSend(): IntegrationOperation {
  const op = createEmailSendOperation("outlook", ["oauth_outlook"], (ctx) =>
    productionUsesPlaygroundStub(ctx, op)
  )
  return op
}

const gmailProvider: IntegrationProvider = {
  id: "gmail",
  label: "Gmail",
  description: "Google Gmail via OAuth",
  supportedAuth: ["oauth"],
  secretKinds: ["oauth_gmail"],
  requireSecret: true,
  operations: [
    createEmailReceiveOperation(
      "gmail",
      ["oauth_gmail"],
      productionReceivePassthrough
    ),
    createGmailSend(),
  ],
}

const outlookProvider: IntegrationProvider = {
  id: "outlook",
  label: "Outlook",
  description: "Microsoft Outlook via Graph",
  supportedAuth: ["oauth"],
  secretKinds: ["oauth_outlook"],
  requireSecret: true,
  operations: [
    createEmailReceiveOperation(
      "outlook",
      ["oauth_outlook"],
      productionReceivePassthrough
    ),
    createOutlookSend(),
  ],
}

function validateWebhookEmit(
  config: Record<string, unknown>
): IntegrationValidationResult {
  const url =
    (typeof config.urlField === "string" && config.urlField.trim()) ||
    (typeof config.urlText === "string" && config.urlText.trim())
  if (!url) {
    return { ok: false, message: "Provide a webhook URL." }
  }
  return { ok: true }
}

const webhookEmitOperation: IntegrationOperation = {
  id: "emit",
  label: "Emit",
  description: "POST the current payload to an external webhook URL",
  nodeKind: "sequential",
  getConfigFields: () => [
    {
      key: "urlField",
      label: "URL field",
      type: "upstream-field",
    },
    {
      key: "urlText",
      label: "URL",
      type: "string",
      placeholder: "https://hooks.example.com/…",
    },
    {
      key: "authMode",
      label: "Credentials",
      type: "select",
      options: [
        { label: "None", value: "none" },
        { label: "Secret (Resources)", value: "secret" },
        { label: "Public (inline)", value: "public" },
      ],
      defaultValue: "none",
    },
    {
      key: "secretName",
      label: "Secret",
      type: "secret-select",
      secretKinds: ["api_key", "bearer_token", "webhook_signing"],
    },
  ],
  validate: validateWebhookEmit,
  executePlayground: async (ctx) => {
    const validation = validateWebhookEmit(ctx.node.config)
    if (!validation.ok) {
      return validation
    }
    return {
      ok: true,
      payload: {
        ...ctx.payload,
        webhookEmitted: true,
        webhookStatus: 200,
      },
      message: "Simulated webhook emit",
    }
  },
  executeProduction: async (ctx) => {
    const validation = validateWebhookEmit(ctx.node.config)
    if (!validation.ok) {
      return validation
    }
    return {
      ok: true,
      payload: {
        ...ctx.payload,
        webhookEmitted: true,
        webhookStatus: 200,
      },
      message: "Simulated webhook emit (inject server runtime for live POST)",
    }
  },
}

const webhookProvider: IntegrationProvider = {
  id: "webhook",
  label: "Webhook",
  description: "Outbound webhook POSTs",
  supportedAuth: ["api_key", "none"],
  secretKinds: ["api_key", "bearer_token", "webhook_signing"],
  operations: [webhookEmitOperation],
}

export const INTEGRATION_SERVICES: IntegrationService[] = [
  {
    id: "email",
    label: "Email",
    description: "Send and receive email via Gmail or Outlook",
    providers: [gmailProvider, outlookProvider],
  },
  {
    id: "api",
    label: "API",
    description: "Call external REST APIs",
    providers: [restProvider],
  },
  {
    id: "webhook",
    label: "Webhook",
    description: "Emit outbound webhook signals",
    providers: [webhookProvider],
  },
]

export function getIntegrationService(serviceId: string) {
  return INTEGRATION_SERVICES.find((service) => service.id === serviceId)
}

export function getIntegrationProvider(serviceId: string, providerId: string) {
  return getIntegrationService(serviceId)?.providers.find(
    (provider) => provider.id === providerId
  )
}

export function getIntegrationOperation(
  serviceId: string,
  providerId: string,
  operationId: string
) {
  return getIntegrationProvider(serviceId, providerId)?.operations.find(
    (operation) => operation.id === operationId
  )
}

export function listOperationsForNodeKind(
  serviceId: string,
  providerId: string,
  nodeKind: "trigger" | "sequential"
) {
  const provider = getIntegrationProvider(serviceId, providerId)
  if (!provider) {
    return []
  }
  return provider.operations.filter((operation) => operation.nodeKind === nodeKind)
}

export function resolveIntegrationOperationFromNode(node: {
  kind: string
  config: Record<string, unknown>
}) {
  const service = String(node.config.service ?? "")
  const provider = String(node.config.provider ?? "")
  const operation = String(node.config.operation ?? "")
  if (!service || !provider || !operation) {
    return null
  }
  const op = getIntegrationOperation(service, provider, operation)
  if (!op) {
    return null
  }
  if (op.nodeKind === "trigger" && node.kind !== "trigger") {
    return null
  }
  if (op.nodeKind === "sequential" && node.kind !== "sequential") {
    return null
  }
  return op
}
