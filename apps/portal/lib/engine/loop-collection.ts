import { resolvePayloadField } from "@/lib/engine/playground-data-table"

export function normalizeCollection(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value
  }

  if (value === undefined || value === null) {
    return []
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) {
      return []
    }

    try {
      const parsed = JSON.parse(trimmed) as unknown
      if (Array.isArray(parsed)) {
        return parsed
      }
      if (parsed !== null && typeof parsed === "object") {
        return [parsed]
      }
    } catch {
      if (trimmed.includes(",")) {
        return trimmed.split(",").map((entry) => entry.trim()).filter(Boolean)
      }
    }

    return [trimmed]
  }

  if (typeof value === "object") {
    return [value]
  }

  return [value]
}

export function resolveCollectionFromField(
  payload: unknown,
  collectionField: unknown
) {
  if (typeof collectionField !== "string" || !collectionField.trim()) {
    return []
  }

  return normalizeCollection(resolvePayloadField(payload, collectionField))
}
