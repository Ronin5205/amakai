import {
  COMPONENT_CATALOG,
  COMPONENT_CATEGORIES,
} from "@/lib/design/component-catalog"
import { COMPONENT_VARIANT_SPECS } from "@/lib/design/component-variant-definitions"
import { NODE_DEFINITIONS } from "@/lib/design/node-definitions"
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
        item.defaultConfig
          ? `Default config keys: ${Object.keys(item.defaultConfig).join(", ")}`
          : "",
        ...ports,
      ]
        .filter(Boolean)
        .join("\n"),
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
