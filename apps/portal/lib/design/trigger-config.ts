import type { WorkflowNode } from "@/lib/domain/workflow"
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

export const TRIGGER_MODE_OPTIONS: Array<{ label: string; value: TriggerMode }> =
  [
    { label: "Manual", value: "manual" },
    { label: "Schedule", value: "schedule" },
    { label: "Webhook", value: "webhook" },
    { label: "Signal", value: "signal" },
    { label: "External tool", value: "integration" },
  ]

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

function isTriggerMode(value: unknown): value is TriggerMode {
  return (
    value === "manual" ||
    value === "schedule" ||
    value === "webhook" ||
    value === "signal" ||
    value === "integration"
  )
}

/**
 * Resolve how a trigger starts the workflow.
 * Prefers `triggerMode`, then legacy `triggerType`, then old catalog id defaults.
 */
export function normalizeTriggerMode(node: WorkflowNode): TriggerMode {
  if (isTriggerMode(node.config.triggerMode)) {
    return node.config.triggerMode
  }

  if (isTriggerMode(node.config.triggerType)) {
    // Legacy classic trigger used triggerType; "webhook" there was UI-only —
    // keep it as webhook so deploy now registers a real subscription.
    return node.config.triggerType
  }

  const rawCatalogId = readRawCatalogItemId(node)
  if (rawCatalogId === "trigger.external-tool") {
    return "integration"
  }
  if (rawCatalogId === "trigger.api") {
    return "webhook"
  }

  return "manual"
}

export function isIntegrationTrigger(node: WorkflowNode): boolean {
  return normalizeTriggerMode(node) === "integration"
}

export function resolveTriggerDisplayLabel(node: WorkflowNode): string {
  const mode = normalizeTriggerMode(node)
  if (mode === "integration") {
    const provider = String(node.config.provider ?? "").trim()
    const operation = String(node.config.operation ?? "receive").trim()
    if (provider) {
      return `${provider}:${operation}`
    }
    return operation || "integration"
  }
  return mode
}

export function needsWebhookToken(node: WorkflowNode): boolean {
  const mode = normalizeTriggerMode(node)
  return mode === "webhook" || mode === "signal"
}

export function defaultOutputFieldsForTriggerMode(mode: TriggerMode) {
  if (mode === "integration") {
    return EMAIL_RECEIVE_OUTPUT_FIELDS.map((field) => ({ ...field }))
  }

  return [{ name: "payload", type: "object" as const }]
}

export function applyTriggerModeDefaults(
  mode: TriggerMode,
  current: Record<string, unknown>
): Record<string, unknown> {
  const next: Record<string, unknown> = {
    ...current,
    triggerMode: mode,
  }

  // Keep legacy key in sync for older readers.
  if (mode !== "integration") {
    next.triggerType = mode
  }

  if (mode === "integration") {
    if (!next.service) next.service = "email"
    if (!next.provider) next.provider = "gmail"
    if (!next.operation) next.operation = "receive"
    if (!next.authMode) next.authMode = "secret"

    const defs = defaultOutputFieldsForTriggerMode("integration")
    next.outputFieldDefs = defs
    next.outputFields = defs.map((field) => field.name)
    next.outputFieldTypes = Object.fromEntries(
      defs.map((field) => [field.name, field.type])
    )
  }

  if (mode === "webhook" || mode === "signal") {
    if (!next.authMode) next.authMode = "none"
    if (!next.webhookToken || String(next.webhookToken).trim() === "") {
      next.webhookToken = crypto.randomUUID()
    }
  }

  return next
}
