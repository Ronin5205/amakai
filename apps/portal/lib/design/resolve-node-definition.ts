import {
  getComponentVariantSpec,
  getCatalogItemId,
} from "@/lib/design/component-variant-definitions"
import { getComponentCatalogItemById } from "@/lib/design/component-catalog"
import { getNodeDefinition } from "@/lib/design/node-definitions"
import {
  isIntegrationTrigger,
  isUnifiedTriggerCatalogId,
  TRIGGER_MODE_OPTIONS,
} from "@/lib/design/trigger-config"
import type {
  ConfigSchemaField,
  NodeDefinition,
  WorkflowNode,
} from "@/lib/domain/workflow"
import { getIntegrationOperation } from "@/lib/integrations/registry"

function buildExternalToolConfigSchema(node: WorkflowNode): ConfigSchemaField[] {
  const cascade: ConfigSchemaField[] = [
    {
      key: "integration",
      label: "Service / provider / operation",
      type: "integration-config",
      description: "Choose the external service, provider, and operation.",
    },
  ]

  const service = String(node.config.service ?? "")
  const provider = String(node.config.provider ?? "")
  const operation = String(node.config.operation ?? "")
  if (!service || !provider || !operation) {
    return cascade
  }

  const op = getIntegrationOperation(service, provider, operation)
  if (!op) {
    return cascade
  }

  const authMode =
    node.config.authMode === "public"
      ? "public"
      : node.config.authMode === "none"
        ? "none"
        : "secret"

  const dynamic = op
    .getConfigFields({
      node,
      nodeKind: node.kind,
      serviceId: service,
      providerId: provider,
      operationId: operation,
    })
    .filter((field) => {
      if (
        field.key === "service" ||
        field.key === "provider" ||
        field.key === "operation"
      ) {
        return false
      }
      if (field.key === "secretName" && authMode !== "secret") {
        return false
      }
      if (
        (field.key === "publicApiKey" || field.key === "publicCredentials") &&
        authMode !== "public"
      ) {
        return false
      }
      return true
    })

  return [...cascade, ...dynamic]
}

function buildUnifiedTriggerConfigSchema(node: WorkflowNode): ConfigSchemaField[] {
  const modeField: ConfigSchemaField = {
    key: "triggerMode",
    label: "Mode",
    type: "select",
    options: TRIGGER_MODE_OPTIONS.map((option) => ({ ...option })),
    defaultValue: "manual",
    description:
      "How this workflow starts: manually, on a schedule, via webhook/signal, or from an external tool.",
  }

  if (isIntegrationTrigger(node)) {
    return [modeField, ...buildExternalToolConfigSchema(node)]
  }

  const variant = getComponentVariantSpec("trigger.workflow")
  return variant?.configSchema ?? [modeField]
}

export function resolveNodeDefinition(node: WorkflowNode): NodeDefinition {
  const base = getNodeDefinition(node.kind)
  const catalogItemId = getCatalogItemId(node)
  const variant = getComponentVariantSpec(catalogItemId)

  if (!variant) {
    return base
  }

  const ports = variant.resolvePorts?.(node) ?? {
    inputs: variant.inputs,
    outputs: variant.outputs,
  }

  const catalogItem = catalogItemId
    ? getComponentCatalogItemById(catalogItemId)
    : undefined

  let configSchema =
    variant.configSchema !== undefined ? variant.configSchema : base.configSchema

  if (isUnifiedTriggerCatalogId(catalogItemId)) {
    configSchema = buildUnifiedTriggerConfigSchema(node)
  } else if (catalogItemId === "integrations.external-tool") {
    configSchema = buildExternalToolConfigSchema(node)
  }

  if (catalogItemId === "integrations.http-request") {
    const op = getIntegrationOperation("api", "rest", "request")
    if (op) {
      configSchema = op
        .getConfigFields({
          node,
          nodeKind: node.kind,
          serviceId: "api",
          providerId: "rest",
          operationId: "request",
        })
        .filter((field) => {
          const authMode =
            node.config.authMode === "public"
              ? "public"
              : node.config.authMode === "none"
                ? "none"
                : "secret"
          if (field.key === "secretName" && authMode !== "secret") {
            return false
          }
          if (field.key === "publicApiKey" && authMode !== "public") {
            return false
          }
          return true
        })
    }
  }

  return {
    ...base,
    description: catalogItem?.description ?? base.description,
    inputs: ports.inputs,
    outputs: ports.outputs,
    configSchema,
  }
}

export { getCatalogItemId } from "@/lib/design/component-variant-definitions"
