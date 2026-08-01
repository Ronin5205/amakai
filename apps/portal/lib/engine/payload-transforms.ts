import { normalizeCollection } from "@/lib/engine/loop-collection"
import {
  mergePayload,
  resolvePayloadField,
} from "@/lib/engine/playground-data-table"

const COLLECTION_FIELD_CANDIDATES = [
  "dataTableRows",
  "loopItems",
  "items",
  "orders",
  "rows",
  "records",
]

export function resolveItemsCollection(
  payload: unknown,
  itemsField?: string
): unknown[] {
  if (itemsField?.trim()) {
    return normalizeCollection(resolvePayloadField(payload, itemsField))
  }

  if (typeof payload === "object" && payload !== null) {
    const record = payload as Record<string, unknown>

    for (const key of COLLECTION_FIELD_CANDIDATES) {
      if (Array.isArray(record[key])) {
        return record[key]
      }
    }
  }

  return normalizeCollection(payload)
}

function fieldNameFromRef(sourceField: string) {
  return sourceField.includes(".")
    ? sourceField.slice(sourceField.indexOf(".") + 1)
    : sourceField
}

function readItemField(item: unknown, fieldName: string) {
  if (typeof item !== "object" || item === null) {
    return undefined
  }

  return (item as Record<string, unknown>)[fieldName]
}

export function mergeBranchPayloads(branchA: unknown, branchB: unknown) {
  const left =
    typeof branchA === "object" && branchA !== null
      ? (branchA as Record<string, unknown>)
      : { value: branchA }
  const right =
    typeof branchB === "object" && branchB !== null
      ? (branchB as Record<string, unknown>)
      : { value: branchB }

  const merged: Record<string, unknown> = {
    branchA: left,
    branchB: right,
  }

  for (const [key, value] of Object.entries(left)) {
    if (!(key in merged)) {
      merged[key] = value
    }
  }

  for (const [key, value] of Object.entries(right)) {
    if (key in merged && merged[key] !== value) {
      merged[`branchB_${key}`] = value
    } else if (!(key in merged)) {
      merged[key] = value
    }
  }

  return mergePayload(merged, {
    mergedAt: new Date().toISOString(),
    mergeSourceCount: 2,
  })
}

export function aggregateItemsByField(
  payload: unknown,
  groupByField: string,
  itemsField?: string
) {
  const groupFieldName = fieldNameFromRef(groupByField)
  const items = resolveItemsCollection(payload, itemsField)
  const groups: Record<string, unknown[]> = {}

  for (const item of items) {
    const rawKey = readItemField(item, groupFieldName)
    const key =
      rawKey === undefined || rawKey === null ? "unknown" : String(rawKey)
    const bucket = groups[key] ?? []
    bucket.push(item)
    groups[key] = bucket
  }

  const groupKeys = Object.keys(groups)

  return mergePayload(payload, {
    groups,
    groupKeys,
    groupCount: groupKeys.length,
    itemCount: items.length,
    aggregatedBy: groupFieldName,
  })
}