import type { OutputFieldType } from "@/lib/design/output-fields"
import { upstreamFieldRefToJsonPath } from "@/lib/design/node-payload"

/** Workflow payloads are JSON objects at runtime. */
export type JsonObject = Record<string, unknown>

export function ensureJsonObject(payload: unknown): JsonObject {
  if (typeof payload === "object" && payload !== null && !Array.isArray(payload)) {
    return payload as JsonObject
  }

  if (payload === undefined || payload === null) {
    return {}
  }

  return { value: payload }
}

export function cloneJsonValue<T = unknown>(value: T): T {
  if (value === undefined) {
    return value
  }

  try {
    return JSON.parse(JSON.stringify(value)) as T
  } catch {
    return value
  }
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue)
  }

  if (typeof value === "object" && value !== null) {
    return Object.keys(value as JsonObject)
      .sort((left, right) => left.localeCompare(right))
      .reduce<JsonObject>((accumulator, key) => {
        accumulator[key] = sortJsonValue((value as JsonObject)[key])
        return accumulator
      }, {})
  }

  return value
}

export function formatJsonForDisplay(value: unknown, emptyLabel = "—") {
  if (value === undefined) {
    return emptyLabel
  }

  try {
    return JSON.stringify(sortJsonValue(value), null, 2)
  } catch {
    return String(value)
  }
}

export function parseJsonText(
  text: string,
  options?: { requireObject?: boolean; label?: string }
) {
  const trimmed = text.trim()
  if (trimmed === "") {
    throw new Error(`${options?.label ?? "JSON"} cannot be empty.`)
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed) as unknown
  } catch {
    throw new Error(`${options?.label ?? "JSON"} is not valid JSON.`)
  }

  if (options?.requireObject) {
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error(`${options?.label ?? "JSON"} must be a JSON object.`)
    }
  }

  return parsed
}

/** Parse array input as comma-separated values; JSON arrays still supported when input starts with `[`. */
export function parseCommaSeparatedArray(text: string): unknown[] {
  const trimmed = text.trim()
  if (!trimmed) {
    return []
  }

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed
      }
    } catch {
      // Fall through to comma-separated parsing.
    }
  }

  if (trimmed.includes(",")) {
    return trimmed
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
  }

  return [trimmed]
}

export function parseJsonFieldValue(text: string, fieldType: OutputFieldType = "string") {
  const trimmed = text.trim()
  if (trimmed === "") {
    return undefined
  }

  if (fieldType === "string") {
    try {
      return JSON.parse(trimmed) as unknown
    } catch {
      return trimmed
    }
  }

  if (fieldType === "array") {
    return parseCommaSeparatedArray(trimmed)
  }

  const parsed = parseJsonText(trimmed, {
    label: "Object field",
  })

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed)
  ) {
    throw new Error("Object field must be a JSON object.")
  }

  return parsed
}

function readJsonPathSegment(
  value: unknown,
  segment: string
): unknown {
  if (segment === "") {
    return value
  }

  if (Array.isArray(value)) {
    const index = Number(segment)
    if (!Number.isInteger(index) || index < 0) {
      return undefined
    }
    return value[index]
  }

  if (typeof value === "object" && value !== null) {
    return (value as JsonObject)[segment]
  }

  return undefined
}

/** Read nested values using dot paths (`orders.0.id`). */
export function readJsonPath(payload: unknown, path: string) {
  const normalized = path.trim()
  if (!normalized) {
    return undefined
  }

  return normalized.split(".").reduce<unknown>((current, segment) => {
    if (current === undefined || current === null) {
      return undefined
    }
    return readJsonPathSegment(current, segment)
  }, ensureJsonObject(payload))
}

export function resolvePayloadField(payload: unknown, sourceField: string) {
  if (!sourceField.trim()) {
    return undefined
  }

  const jsonPath =
    upstreamFieldRefToJsonPath(sourceField) ??
    (sourceField.includes(".")
      ? sourceField.slice(sourceField.indexOf(".") + 1)
      : sourceField)

  return readJsonPath(payload, jsonPath)
}
