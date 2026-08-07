import {
  COMPONENT_CATALOG,
  COMPONENT_CATEGORIES,
} from "@/lib/design/component-catalog"
import { COMPONENT_VARIANT_SPECS } from "@/lib/design/component-variant-definitions"
import { NODE_DEFINITIONS } from "@/lib/design/node-definitions"
import { INTEGRATION_SERVICES } from "@/lib/integrations/registry"
import {
  COMPONENT_BUILD_HINTS,
  WORKFLOW_BUILD_RULES,
} from "@/lib/ai/workflow-build-rules"
import {
  getWorkflowBuildGuide,
  GMAIL_INBOX_TO_TABLE_EXAMPLE,
} from "@/lib/ai/workflow-build-guide"
import type { KnowledgeChunkDraft } from "@/lib/ai/chunking"

/** Generate RAG chunks from the live component catalog / node definitions. */
export function buildCatalogKnowledgeChunks(): KnowledgeChunkDraft[] {
  const chunks: KnowledgeChunkDraft[] = []

  for (const category of COMPONENT_CATEGORIES) {
    chunks.push({
      source: "catalog:categories",
      heading: `Category: ${category.label}`,
      content: [
        `Category id: ${category.id}`,
        `Label: ${category.label}`,
        `Description: ${category.description}`,
        category.baseKind ? `Base node kind: ${category.baseKind}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    })
  }

  for (const item of COMPONENT_CATALOG) {
    const spec = COMPONENT_VARIANT_SPECS[item.id]
    const ports = spec
      ? [
          `Inputs: ${(spec.inputs ?? []).map((p) => `${p.id} (${p.label})`).join(", ") || "none"}`,
          `Outputs: ${(spec.outputs ?? []).map((p) => `${p.id} (${p.label})`).join(", ") || "none"}`,
          `Config fields: ${(spec.configSchema ?? [])
            .map((f) => `${f.key}:${f.type}${f.required ? "*" : ""}`)
            .join(", ") || "none"}`,
        ]
      : []

    chunks.push({
      source: "catalog:components",
      heading: `Component: ${item.label} (${item.id})`,
      content: [
        `Catalog id: ${item.id}`,
        `Kind: ${item.kind}`,
        `Category: ${item.categoryId}`,
        `Label: ${item.label}`,
        `Description: ${item.description}`,
        COMPONENT_BUILD_HINTS[item.id]
          ? `Build hint: ${COMPONENT_BUILD_HINTS[item.id]}`
          : "",
        item.defaultConfig
          ? `Default config keys: ${Object.keys(item.defaultConfig).join(", ")}`
          : "",
        ...ports,
      ]
        .filter(Boolean)
        .join("\n"),
    })
  }

  chunks.push({
    source: "catalog:workflow-build",
    heading: "Workflow build rules for the assistant",
    content: WORKFLOW_BUILD_RULES,
  })

  const guide = getWorkflowBuildGuide()
  chunks.push({
    source: "catalog:workflow-example",
    heading: "Example workflow: Gmail inbox to data table",
    content: JSON.stringify(GMAIL_INBOX_TO_TABLE_EXAMPLE, null, 2),
  })

  chunks.push({
    source: "catalog:workflow-privileges",
    heading: "Assistant resource privileges",
    content: JSON.stringify(guide.privileges, null, 2),
  })

  for (const service of INTEGRATION_SERVICES) {
    chunks.push({
      source: "catalog:integrations",
      heading: `Integration service: ${service.label}`,
      content: [
        `Service id: ${service.id}`,
        service.description,
        ...service.providers.flatMap((provider) =>
          provider.operations.map(
            (operation) =>
              `Provider ${provider.id}: operation ${operation.id} (${operation.nodeKind}) — ${operation.description}`
          )
        ),
        "Inbound Gmail/Outlook email uses trigger.workflow triggerMode=integration, not integrations.external-tool.",
      ].join("\n"),
    })
  }

  for (const definition of Object.values(NODE_DEFINITIONS)) {
    chunks.push({
      source: "catalog:node-kinds",
      heading: `Node kind: ${definition.kind}`,
      content: [
        `Kind: ${definition.kind}`,
        `Label: ${definition.label}`,
        `Description: ${definition.description}`,
        `Inputs: ${definition.inputs.map((p) => p.id).join(", ")}`,
        `Outputs: ${definition.outputs.map((p) => p.id).join(", ")}`,
        `Config schema: ${definition.configSchema
          .map((f) => `${f.key}:${f.type}`)
          .join(", ")}`,
      ].join("\n"),
    })
  }

  return chunks
}
