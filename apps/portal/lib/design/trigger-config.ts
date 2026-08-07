import type { WorkflowNode } from "@/lib/domain/workflow"
import type { OutputFieldDef } from "@/lib/design/output-fields"
import { EMAIL_RECEIVE_OUTPUT_FIELDS } from "@/lib/integrations/registry/email-operations"

/** Canonical catalog id for the single Trigger component. */
export const UNIFIED_TRIGGER_CATALOG_ID = "trigger.workflow"

/** Legacy catalog ids still present in saved graphs. */
export const LEGACY_TRIGGER_CATALOG_IDS = [
  "trigger.api",
  "trigger.external-tool",
] as const

export type LegacyTriggerCatalogId = (typeof LEGACY_TRIGGER_CATALOG_IDS)[number]

export type TriggerMode =
  | "manual"
  | "schedule"
  | "webhook"
  | "signal"
  | "integration"

/** Stable recipe ids the AI (and UI) can pick without inventing modes. */
export type TriggerRecipeId =
  | "manual"
  | "schedule"
  | "webhook"
  | "signal"
  | "gmail.receive"
  | "outlook.receive"

export type TriggerRecipe = {
  id: TriggerRecipeId
  mode: TriggerMode
  label: string
  description: string
  /** Partial config merged when this recipe is applied. */
  config: Record<string, unknown>
  outputFields: OutputFieldDef[]
  /** One-line instruction for the assistant. */
  aiHint: string
}

export const TRIGGER_MODE_OPTIONS: Array<{ label: string; value: TriggerMode }> =
  [
    { label: "Manual", value: "manual" },
    { label: "Schedule", value: "schedule" },
    { label: "Webhook", value: "webhook" },
    { label: "Signal", value: "signal" },
    { label: "External tool", value: "integration" },
  ]

const GENERIC_PAYLOAD_OUTPUT: OutputFieldDef[] = [
  { name: "payload", type: "object" },
]

/** Values users/AI may put in triggerMode that map to a canonical mode. */
const TRIGGER_MODE_ALIASES: Record<string, TriggerMode> = {
  manual: "manual",
  schedule: "schedule",
  cron: "schedule",
  webhook: "webhook",
  api: "webhook",
  http: "webhook",
  signal: "signal",
  integration: "integration",
  email: "integration",
  gmail: "integration",
  outlook: "integration",
  inbox: "integration",
  receive: "integration",
  "external-tool": "integration",
  external: "integration",
}

export const TRIGGER_RECIPES: TriggerRecipe[] = [
  {
    id: "manual",
    mode: "manual",
    label: "Manual",
    description: "Start from Testing / playground with a custom payload.",
    config: { triggerMode: "manual" },
    outputFields: GENERIC_PAYLOAD_OUTPUT,
    aiHint: "triggerMode=manual. Define outputFieldDefs for fields downstream nodes read.",
  },
  {
    id: "schedule",
    mode: "schedule",
    label: "Schedule",
    description: "Fire on a local-time schedule (once, daily, weekdays, weekly).",
    config: { triggerMode: "schedule" },
    outputFields: GENERIC_PAYLOAD_OUTPUT,
    aiHint: "triggerMode=schedule plus config.schedule (TriggerSchedule v1).",
  },
  {
    id: "webhook",
    mode: "webhook",
    label: "Webhook",
    description: "HTTP POST to /api/webhooks/{token} starts the workflow.",
    config: { triggerMode: "webhook", authMode: "none" },
    outputFields: GENERIC_PAYLOAD_OUTPUT,
    aiHint: "triggerMode=webhook. webhookToken is auto-filled on deploy.",
  },
  {
    id: "signal",
    mode: "signal",
    label: "Signal",
    description: "Named inbound signal via the same webhook endpoint.",
    config: { triggerMode: "signal", authMode: "none" },
    outputFields: GENERIC_PAYLOAD_OUTPUT,
    aiHint: "triggerMode=signal. Same URL machinery as webhook; operation label differs.",
  },
  {
    id: "gmail.receive",
    mode: "integration",
    label: "Gmail inbox",
    description: "Start when a new Gmail message arrives in INBOX.",
    config: {
      triggerMode: "integration",
      service: "email",
      provider: "gmail",
      operation: "receive",
      authMode: "secret",
    },
    outputFields: EMAIL_RECEIVE_OUTPUT_FIELDS.map((field) => ({ ...field })),
    aiHint:
      "triggerMode=integration, service=email, provider=gmail, operation=receive, authMode=secret, secretName from list_secret_names (oauth_gmail).",
  },
  {
    id: "outlook.receive",
    mode: "integration",
    label: "Outlook inbox",
    description: "Start when a new Outlook message arrives.",
    config: {
      triggerMode: "integration",
      service: "email",
      provider: "outlook",
      operation: "receive",
      authMode: "secret",
    },
    outputFields: EMAIL_RECEIVE_OUTPUT_FIELDS.map((field) => ({ ...field })),
    aiHint:
      "triggerMode=integration, service=email, provider=outlook, operation=receive, authMode=secret, secretName from list_secret_names (oauth_outlook).",
  },
]

const RECIPE_BY_ID = Object.fromEntries(
  TRIGGER_RECIPES.map((recipe) => [recipe.id, recipe])
) as Record<TriggerRecipeId, TriggerRecipe>

export function isLegacyTriggerCatalogId(
  catalogItemId: string | undefined
): catalogItemId is LegacyTriggerCatalogId {
  return (
    catalogItemId === "trigger.api" || catalogItemId === "trigger.external-tool"
  )
}

export function isUnifiedTriggerCatalogId(
  catalogItemId: string | undefined
): boolean {
  return (
    catalogItemId === UNIFIED_TRIGGER_CATALOG_ID ||
    isLegacyTriggerCatalogId(catalogItemId)
  )
}

/** Map deprecated catalog ids onto the unified Trigger. */
export function resolveCanonicalTriggerCatalogId(
  catalogItemId: string | undefined
): string | undefined {
  if (!catalogItemId) {
    return undefined
  }
  if (isLegacyTriggerCatalogId(catalogItemId)) {
    return UNIFIED_TRIGGER_CATALOG_ID
  }
  return catalogItemId
}

function readRawCatalogItemId(node: WorkflowNode): string | undefined {
  const fromConfig = node.config.catalogItemId ?? node.config.componentVariant
  return typeof fromConfig === "string" && fromConfig.length > 0
    ? fromConfig
    : undefined
}

export function isTriggerMode(value: unknown): value is TriggerMode {
  return (
    value === "manual" ||
    value === "schedule" ||
    value === "webhook" ||
    value === "signal" ||
    value === "integration"
  )
}

function coerceTriggerMode(value: unknown): TriggerMode | null {
  if (typeof value !== "string") {
    return null
  }
  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return null
  }
  if (isTriggerMode(normalized)) {
    return normalized
  }
  return TRIGGER_MODE_ALIASES[normalized] ?? null
}

function looksLikeEmailInboxLabel(label: string): boolean {
  return /\b(gmail|outlook|inbox|email\s*trigger|mail\s*trigger|new\s*email)\b/i.test(
    label
  )
}

function inferEmailProviderFromLabel(label: string): "gmail" | "outlook" {
  return /\boutlook\b/i.test(label) ? "outlook" : "gmail"
}

export function getTriggerRecipe(id: TriggerRecipeId): TriggerRecipe {
  return RECIPE_BY_ID[id]
}

/** Pick the best recipe for a trigger config + optional label. */
export function resolveTriggerRecipe(
  config: Record<string, unknown>,
  options?: { label?: string; catalogItemId?: string }
): TriggerRecipe {
  const provider = String(config.provider ?? "").trim().toLowerCase()
  const operation = String(config.operation ?? "").trim().toLowerCase()
  const service = String(config.service ?? "").trim().toLowerCase()
  const modeHint =
    coerceTriggerMode(config.triggerMode) ??
    coerceTriggerMode(config.triggerType)

  if (
    (modeHint === "integration" || service === "email") &&
    (provider === "outlook" || provider === "gmail") &&
    (operation === "receive" || !operation)
  ) {
    return provider === "outlook"
      ? getTriggerRecipe("outlook.receive")
      : getTriggerRecipe("gmail.receive")
  }

  if (modeHint === "integration" || service === "email") {
    const label = options?.label ?? ""
    return getTriggerRecipe(
      inferEmailProviderFromLabel(label) === "outlook"
        ? "outlook.receive"
        : "gmail.receive"
    )
  }

  if (modeHint === "schedule") {
    return getTriggerRecipe("schedule")
  }
  if (modeHint === "webhook") {
    return getTriggerRecipe("webhook")
  }
  if (modeHint === "signal") {
    return getTriggerRecipe("signal")
  }

  const catalogItemId = options?.catalogItemId
  if (catalogItemId === "trigger.external-tool") {
    return getTriggerRecipe("gmail.receive")
  }
  if (catalogItemId === "trigger.api") {
    return getTriggerRecipe("webhook")
  }

  if (options?.label && looksLikeEmailInboxLabel(options.label)) {
    return getTriggerRecipe(
      inferEmailProviderFromLabel(options.label) === "outlook"
        ? "outlook.receive"
        : "gmail.receive"
    )
  }

  return getTriggerRecipe("manual")
}

/**
 * Resolve how a trigger starts the workflow.
 * Prefers `triggerMode`, then legacy `triggerType`, then recipe inference.
 */
export function normalizeTriggerMode(node: WorkflowNode): TriggerMode {
  return resolveTriggerRecipe(node.config, {
    label: node.label,
    catalogItemId: readRawCatalogItemId(node),
  }).mode
}

export function isIntegrationTrigger(node: WorkflowNode): boolean {
  return normalizeTriggerMode(node) === "integration"
}

export function resolveTriggerDisplayLabel(node: WorkflowNode): string {
  const recipe = resolveTriggerRecipe(node.config, {
    label: node.label,
    catalogItemId: readRawCatalogItemId(node),
  })
  if (recipe.mode === "integration") {
    const provider = String(node.config.provider ?? recipe.config.provider ?? "")
    const operation = String(
      node.config.operation ?? recipe.config.operation ?? "receive"
    )
    if (provider) {
      return `${provider}:${operation}`
    }
    return operation || "integration"
  }
  return recipe.mode
}

export function needsWebhookToken(node: WorkflowNode): boolean {
  const mode = normalizeTriggerMode(node)
  return mode === "webhook" || mode === "signal"
}

export function defaultOutputFieldsForTriggerMode(mode: TriggerMode) {
  if (mode === "integration") {
    return EMAIL_RECEIVE_OUTPUT_FIELDS.map((field) => ({ ...field }))
  }
  return GENERIC_PAYLOAD_OUTPUT.map((field) => ({ ...field }))
}

function withSerializedOutputs(
  config: Record<string, unknown>,
  defs: OutputFieldDef[]
): Record<string, unknown> {
  const cleaned = defs
    .map((def) => ({
      name: def.name.trim(),
      type: def.type,
    }))
    .filter((def) => def.name.length > 0)

  return {
    ...config,
    outputFieldDefs: cleaned,
    outputFields: cleaned.map((field) => field.name),
    outputFieldTypes: Object.fromEntries(
      cleaned.map((field) => [field.name, field.type])
    ),
  }
}

/**
 * Apply mode defaults onto a config object.
 * Always sets output fields for the mode when missing or when switching to integration.
 */
export function applyTriggerModeDefaults(
  mode: TriggerMode,
  current: Record<string, unknown>
): Record<string, unknown> {
  const recipe =
    mode === "integration"
      ? resolveTriggerRecipe({ ...current, triggerMode: mode })
      : getTriggerRecipe(
          mode === "manual"
            ? "manual"
            : mode === "schedule"
              ? "schedule"
              : mode === "webhook"
                ? "webhook"
                : mode === "signal"
                  ? "signal"
                  : "manual"
        )

  let next: Record<string, unknown> = {
    ...current,
    ...recipe.config,
    triggerMode: mode,
  }

  // Keep legacy key in sync for older readers (except integration).
  if (mode !== "integration") {
    next.triggerType = mode
  } else {
    delete next.triggerType
  }

  const existingDefs = Array.isArray(next.outputFieldDefs)
    ? next.outputFieldDefs
    : []
  const looksLikeEmailOutputs = existingDefs.some(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      (entry as { name?: string }).name === "subject"
  )
  const shouldReplaceOutputs =
    mode === "integration" ||
    existingDefs.length === 0 ||
    (mode !== "integration" && looksLikeEmailOutputs)

  if (shouldReplaceOutputs) {
    next = withSerializedOutputs(next, recipe.outputFields)
  }

  if (mode === "webhook" || mode === "signal") {
    if (!next.authMode) next.authMode = "none"
    if (!next.webhookToken || String(next.webhookToken).trim() === "") {
      next.webhookToken = crypto.randomUUID()
    }
  }

  return next
}

/**
 * Fully normalize a trigger node config so AI/UI/runtime share one shape:
 * - canonical catalogItemId
 * - resolved triggerMode (+ recipe defaults for integration)
 * - outputFieldDefs always present for downstream field pickers
 */
export function canonicalizeTriggerConfig(
  config: Record<string, unknown>,
  options?: { label?: string; catalogItemId?: string }
): Record<string, unknown> {
  const catalogItemId =
    typeof config.catalogItemId === "string"
      ? config.catalogItemId
      : options?.catalogItemId

  const recipe = resolveTriggerRecipe(config, {
    label: options?.label,
    catalogItemId,
  })

  const merged: Record<string, unknown> = {
    ...config,
    catalogItemId: UNIFIED_TRIGGER_CATALOG_ID,
    ...recipe.config,
  }

  // Preserve caller-supplied secret / schedule / webhook token / custom outputs.
  if (typeof config.secretName === "string" && config.secretName.trim()) {
    merged.secretName = config.secretName
  }
  if (config.schedule !== undefined) {
    merged.schedule = config.schedule
  }
  if (typeof config.webhookToken === "string" && config.webhookToken.trim()) {
    merged.webhookToken = config.webhookToken
  }
  if (typeof config.authMode === "string" && config.authMode.trim()) {
    merged.authMode = config.authMode
  }
  if (typeof config.publicApiKey === "string") {
    merged.publicApiKey = config.publicApiKey
  }
  if (typeof config.provider === "string" && config.provider.trim()) {
    merged.provider = config.provider
  }
  if (typeof config.service === "string" && config.service.trim()) {
    merged.service = config.service
  }
  if (typeof config.operation === "string" && config.operation.trim()) {
    merged.operation = config.operation
  }
  if (Array.isArray(config.outputFieldDefs) && config.outputFieldDefs.length > 0) {
    merged.outputFieldDefs = config.outputFieldDefs
  }
  if (Array.isArray(config.outputFields) && config.outputFields.length > 0) {
    merged.outputFields = config.outputFields
  }
  if (
    typeof config.outputFieldTypes === "object" &&
    config.outputFieldTypes !== null
  ) {
    merged.outputFieldTypes = config.outputFieldTypes
  }

  return applyTriggerModeDefaults(recipe.mode, merged)
}

export function canonicalizeTriggerNode(node: WorkflowNode): WorkflowNode {
  if (node.kind !== "trigger" && !isUnifiedTriggerCatalogId(
    typeof node.config.catalogItemId === "string"
      ? node.config.catalogItemId
      : undefined
  )) {
    return node
  }

  return {
    ...node,
    kind: "trigger",
    config: canonicalizeTriggerConfig(node.config, {
      label: node.label,
      catalogItemId:
        typeof node.config.catalogItemId === "string"
          ? node.config.catalogItemId
          : undefined,
    }),
  }
}

/** Output fields exposed to downstream nodes / Testing UI. */
export function resolveTriggerOutputFields(node: WorkflowNode): OutputFieldDef[] {
  const recipe = resolveTriggerRecipe(node.config, {
    label: node.label,
    catalogItemId: readRawCatalogItemId(node),
  })

  if (Array.isArray(node.config.outputFieldDefs)) {
    const parsed = node.config.outputFieldDefs.filter(
      (entry): entry is OutputFieldDef =>
        typeof entry === "object" &&
        entry !== null &&
        typeof (entry as OutputFieldDef).name === "string" &&
        ((entry as OutputFieldDef).type === "string" ||
          (entry as OutputFieldDef).type === "array" ||
          (entry as OutputFieldDef).type === "object")
    )
    if (parsed.length > 0) {
      return parsed
    }
  }

  if (Array.isArray(node.config.outputFields)) {
    const names = node.config.outputFields.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim() !== ""
    )
    if (names.length > 0) {
      const types =
        typeof node.config.outputFieldTypes === "object" &&
        node.config.outputFieldTypes !== null &&
        !Array.isArray(node.config.outputFieldTypes)
          ? (node.config.outputFieldTypes as Record<string, unknown>)
          : {}
      return names.map((name) => ({
        name,
        type:
          types[name] === "array" || types[name] === "object"
            ? (types[name] as OutputFieldDef["type"])
            : "string",
      }))
    }
  }

  return recipe.outputFields.map((field) => ({ ...field }))
}

/** Compact knowledge blob for AI tools / RAG / system prompt. */
export function getTriggerBuildKnowledge() {
  return {
    catalogItemId: UNIFIED_TRIGGER_CATALOG_ID,
    kind: "trigger" as const,
    ports: { outputs: ["main-out"], inputs: [] as string[] },
    modes: TRIGGER_MODE_OPTIONS.map((option) => option.value),
    recipes: TRIGGER_RECIPES.map((recipe) => ({
      id: recipe.id,
      mode: recipe.mode,
      label: recipe.label,
      description: recipe.description,
      config: recipe.config,
      outputFields: recipe.outputFields.map((field) => field.name),
      aiHint: recipe.aiHint,
    })),
    rules: [
      "Always use catalogItemId trigger.workflow (never invent trigger.gmail).",
      "Inbound Gmail/Outlook MUST use recipe gmail.receive / outlook.receive (triggerMode=integration). A label alone is not enough.",
      "Outbound email uses integrations.external-tool, not the trigger.",
      "Downstream nodes reference trigger fields as nodeId.fieldName (e.g. trigger-1.subject).",
      "Connect trigger main-out → next node main-in (ports may be omitted; enrichment fills them).",
      `Gmail/Outlook receive output fields: ${EMAIL_RECEIVE_OUTPUT_FIELDS.map((f) => f.name).join(", ")}.`,
    ],
  }
}
