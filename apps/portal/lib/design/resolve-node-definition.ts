import { getComponentVariantSpec, getCatalogItemId } from "@/lib/design/component-variant-definitions"
import { getComponentCatalogItemById } from "@/lib/design/component-catalog"
import { getNodeDefinition } from "@/lib/design/node-definitions"
import type {
  ConfigSchemaField,
  NodeDefinition,
  WorkflowNode,
} from "@/lib/domain/workflow"
import { getIntegrationOperation } from "@/lib/integrations/registry"

const EXTERNAL_TOOL_CATALOG_IDS = new Set([
  "trigger.external-tool",
  "integrations.external-tool",
])

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

  const authMode = node.config.authMode === "public" ? "public" : node.config.authMode === "none" ? "none" : "secret"

  const dynamic = op.getConfigFields({
    node,
    nodeKind: node.kind,
    serviceId: service,
    providerId: provider,
    operationId: operation,
  }).filter((field) => {
    // Cascade already covers service/provider/operation via integration-config
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

  if (catalogItemId && EXTERNAL_TOOL_CATALOG_IDS.has(catalogItemId)) {
    configSchema = buildExternalToolConfigSchema(node)
  }

  // HTTP request node uses registry fields directly when configured as api/rest/request
  if (catalogItemId === "integrations.http-request") {
    const op = getIntegrationOperation("api", "rest", "request")
    if (op) {
      configSchema = op.getConfigFields({
        node,
        nodeKind: node.kind,
        serviceId: "api",
        providerId: "rest",
        operationId: "request",
      }).filter((field) => {
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
