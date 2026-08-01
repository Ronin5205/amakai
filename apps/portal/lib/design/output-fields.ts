import { asStringArray } from "@/lib/design/upstream-fields"

export type OutputFieldType = "string" | "array" | "object"

export type OutputFieldDef = {
  name: string
  type: OutputFieldType
}

function isOutputFieldType(value: unknown): value is OutputFieldType {
  return value === "string" || value === "array" || value === "object"
}

function isOutputFieldDef(value: unknown): value is OutputFieldDef {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as OutputFieldDef).name === "string" &&
    isOutputFieldType((value as OutputFieldDef).type)
  )
}

export function parseOutputFieldDefs(
  config: Record<string, unknown>
): OutputFieldDef[] {
  if (Array.isArray(config.outputFieldDefs)) {
    const parsed = config.outputFieldDefs.filter(isOutputFieldDef)
    if (parsed.length > 0) {
      return parsed
    }
  }

  const names = asStringArray(config.outputFields)
  const types =
    typeof config.outputFieldTypes === "object" &&
    config.outputFieldTypes !== null &&
    !Array.isArray(config.outputFieldTypes)
      ? (config.outputFieldTypes as Record<string, unknown>)
      : {}

  return names.map((name) => ({
    name,
    type: isOutputFieldType(types[name]) ? types[name] : inferOutputFieldType(name),
  }))
}

function inferOutputFieldType(fieldName: string): OutputFieldType {
  const lower = fieldName.toLowerCase()

  if (
    lower.endsWith("s") &&
    (lower.includes("order") ||
      lower.includes("item") ||
      lower.includes("row") ||
      lower.includes("record") ||
      lower.includes("entry") ||
      lower.includes("list") ||
      lower.includes("batch"))
  ) {
    return "array"
  }

  if (lower.includes("items") || lower.includes("orders") || lower.includes("rows")) {
    return "array"
  }

  return "string"
}

export function outputFieldNames(defs: OutputFieldDef[]) {
  return defs.map((def) => def.name).filter(Boolean)
}

export function serializeOutputFieldDefs(defs: OutputFieldDef[]) {
  const cleaned = defs
    .map((def) => ({
      name: def.name.trim(),
      type: def.type,
    }))
    .filter((def) => def.name.length > 0)

  return {
    outputFields: outputFieldNames(cleaned),
    outputFieldDefs: cleaned,
    outputFieldTypes: Object.fromEntries(
      cleaned.map((def) => [def.name, def.type])
    ),
  }
}

export function getOutputFieldType(
  config: Record<string, unknown>,
  fieldName: string
): OutputFieldType {
  return (
    parseOutputFieldDefs(config).find((def) => def.name === fieldName)?.type ??
    "string"
  )
}
