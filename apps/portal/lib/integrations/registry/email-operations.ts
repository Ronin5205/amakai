import type {
  IntegrationConfigContext,
  IntegrationExecuteContext,
  IntegrationExecuteResult,
  IntegrationOperation,
  IntegrationValidationResult,
} from "@/lib/integrations/registry/types"
import type { OutputFieldDef } from "@/lib/design/output-fields"
import type { ConfigSchemaField } from "@/lib/domain/workflow"

export const EMAIL_RECEIVE_OUTPUT_FIELDS: OutputFieldDef[] = [
  { name: "from", type: "string" },
  { name: "to", type: "string" },
  { name: "subject", type: "string" },
  { name: "body", type: "string" },
  { name: "bodyHtml", type: "string" },
  { name: "messageId", type: "string" },
  { name: "threadId", type: "string" },
  { name: "receivedAt", type: "string" },
  { name: "attachments", type: "array" },
]

function authAndCredentialFields(
  secretKinds: string[],
  requireSecret: boolean
): ConfigSchemaField[] {
  const fields: ConfigSchemaField[] = [
    {
      key: "authMode",
      label: "Credentials",
      type: "select",
      options: requireSecret
        ? [
            { label: "Secret (Resources)", value: "secret" },
            {
              label: "Public (not allowed for this provider)",
              value: "public",
            },
          ]
        : [
            { label: "Secret (Resources)", value: "secret" },
            { label: "Public (inline)", value: "public" },
          ],
      defaultValue: "secret",
      description: requireSecret
        ? "OAuth providers must use a connected secret from Resources → Secrets."
        : "Prefer secrets from Resources. Public mode stores values in the workflow graph.",
    },
    {
      key: "secretName",
      label: "Secret",
      type: "secret-select",
      required: true,
      secretKinds,
      description: "Shown when Credentials is Secret.",
    },
  ]

  if (!requireSecret) {
    fields.push({
      key: "publicApiKey",
      label: "Public API key",
      type: "string",
      description: "Shown when Credentials is Public. Not recommended for production.",
    })
  }

  return fields
}

function sendFieldSchema(secretKinds: string[]): ConfigSchemaField[] {
  return [
    ...authAndCredentialFields(secretKinds, true),
    {
      key: "toField",
      label: "To",
      type: "upstream-field",
      required: true,
      description: "Upstream field containing the recipient email address.",
    },
    {
      key: "subjectField",
      label: "Subject",
      type: "upstream-field",
      description: "Upstream field for the subject. Leave empty to use Subject text.",
    },
    {
      key: "subjectText",
      label: "Subject text",
      type: "string",
      placeholder: "Optional static subject",
    },
    {
      key: "bodyField",
      label: "Body",
      type: "upstream-field",
      description: "Upstream field for the body. Leave empty to use Body text.",
    },
    {
      key: "bodyText",
      label: "Body text",
      type: "textarea",
      placeholder: "Optional static body",
    },
    {
      key: "ccField",
      label: "CC",
      type: "upstream-field",
    },
    {
      key: "bccField",
      label: "BCC",
      type: "upstream-field",
    },
  ]
}

function validateSendConfig(
  config: Record<string, unknown>
): IntegrationValidationResult {
  const authMode = config.authMode === "public" ? "public" : "secret"
  if (authMode === "public") {
    return {
      ok: false,
      message: "Gmail and Outlook require a connected secret (authMode=secret).",
    }
  }
  if (!config.secretName || String(config.secretName).trim() === "") {
    return { ok: false, message: "Select a secret from Resources → Secrets." }
  }
  if (!config.toField || String(config.toField).trim() === "") {
    return { ok: false, message: "Select a To field." }
  }
  const hasSubject =
    (typeof config.subjectField === "string" &&
      config.subjectField.trim() !== "") ||
    (typeof config.subjectText === "string" && config.subjectText.trim() !== "")
  if (!hasSubject) {
    return { ok: false, message: "Provide a Subject field or Subject text." }
  }
  const hasBody =
    (typeof config.bodyField === "string" && config.bodyField.trim() !== "") ||
    (typeof config.bodyText === "string" && config.bodyText.trim() !== "")
  if (!hasBody) {
    return { ok: false, message: "Provide a Body field or Body text." }
  }
  return { ok: true }
}

function validateReceiveConfig(
  config: Record<string, unknown>
): IntegrationValidationResult {
  const authMode = config.authMode === "public" ? "public" : "secret"
  if (authMode === "public") {
    return {
      ok: false,
      message: "Email receive requires a connected OAuth secret.",
    }
  }
  if (!config.secretName || String(config.secretName).trim() === "") {
    return { ok: false, message: "Select a connected mailbox secret." }
  }
  return { ok: true }
}

function playgroundSend(
  ctx: IntegrationExecuteContext,
  provider: string
): IntegrationExecuteResult {
  const validation = validateSendConfig(ctx.node.config)
  if (!validation.ok) {
    return validation
  }

  const to = resolveConfiguredValue(ctx.payload, ctx.node.config, "toField")
  const subject =
    resolveConfiguredValue(ctx.payload, ctx.node.config, "subjectField") ||
    String(ctx.node.config.subjectText ?? "")
  const body =
    resolveConfiguredValue(ctx.payload, ctx.node.config, "bodyField") ||
    String(ctx.node.config.bodyText ?? "")

  return {
    ok: true,
    payload: {
      ...ctx.payload,
      sent: true,
      provider,
      messageId: `sim-${provider}-${Date.now()}`,
      to,
      subject,
      bodyPreview: String(body).slice(0, 120),
      sentAt: new Date().toISOString(),
    },
    message: `Simulated ${provider} send to ${to || "(empty)"}`,
  }
}

function playgroundReceive(
  ctx: IntegrationExecuteContext,
  provider: string
): IntegrationExecuteResult {
  const validation = validateReceiveConfig(ctx.node.config)
  if (!validation.ok) {
    return validation
  }

  return {
    ok: true,
    payload: {
      from: "sender@example.com",
      to: "you@example.com",
      subject: "Sample inbound email",
      body: "Hello from the playground.",
      bodyHtml: "<p>Hello from the playground.</p>",
      messageId: `sim-msg-${provider}`,
      threadId: `sim-thread-${provider}`,
      receivedAt: new Date().toISOString(),
      attachments: [],
      triggerType: "email",
      provider,
      triggeredAt: new Date().toISOString(),
      playground: true,
    },
    message: `Simulated ${provider} receive trigger`,
  }
}

export function resolveConfiguredValue(
  payload: Record<string, unknown>,
  config: Record<string, unknown>,
  fieldKey: string
): string {
  const ref = config[fieldKey]
  if (typeof ref !== "string" || ref.trim() === "") {
    return ""
  }

  // upstream-field values are stored as "nodeId.fieldName"
  const parts = ref.split(".")
  const fieldName = parts.length > 1 ? parts.slice(1).join(".") : ref

  const direct = payload[fieldName]
  if (typeof direct === "string" || typeof direct === "number") {
    return String(direct)
  }

  // Also try full path key if present
  const full = payload[ref]
  if (typeof full === "string" || typeof full === "number") {
    return String(full)
  }

  return ""
}

export function createEmailSendOperation(
  provider: "gmail" | "outlook",
  secretKinds: string[],
  executeProduction: (
    ctx: IntegrationExecuteContext
  ) => Promise<IntegrationExecuteResult>
): IntegrationOperation {
  return {
    id: "send",
    label: "Send",
    description: `Send email via ${provider === "gmail" ? "Gmail" : "Outlook"}`,
    nodeKind: "sequential",
    getConfigFields: (_ctx: IntegrationConfigContext) =>
      sendFieldSchema(secretKinds),
    validate: validateSendConfig,
    executePlayground: (ctx) => playgroundSend(ctx, provider),
    executeProduction,
  }
}

export function createEmailReceiveOperation(
  provider: "gmail" | "outlook",
  secretKinds: string[],
  executeProduction: (
    ctx: IntegrationExecuteContext
  ) => Promise<IntegrationExecuteResult>
): IntegrationOperation {
  return {
    id: "receive",
    label: "Receive",
    description: `Trigger when a new email arrives in ${provider === "gmail" ? "Gmail" : "Outlook"}`,
    nodeKind: "trigger",
    defaultOutputFields: EMAIL_RECEIVE_OUTPUT_FIELDS,
    getConfigFields: () => [
      ...authAndCredentialFields(secretKinds, true),
      {
        key: "outputFields",
        label: "Output fields",
        type: "output-fields",
        description:
          "Fields exposed on the trigger payload. Defaults cover common email properties.",
      },
    ],
    validate: validateReceiveConfig,
    executePlayground: (ctx) => playgroundReceive(ctx, provider),
    executeProduction,
  }
}
