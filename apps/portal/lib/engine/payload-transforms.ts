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
  return mergeManyBranchPayloads([branchA, branchB])
}

export function mergeManyBranchPayloads(branches: unknown[]) {
  const normalized = branches.map((branch, index) => {
    if (typeof branch === "object" && branch !== null) {
      return branch as Record<string, unknown>
    }
    return { value: branch, branchIndex: index + 1 }
  })

  const merged: Record<string, unknown> = {
    branches: normalized,
  }

  // Keep legacy keys for 2-input merges used by existing tests/templates.
  if (normalized[0]) {
    merged.branchA = normalized[0]
  }
  if (normalized[1]) {
    merged.branchB = normalized[1]
  }

  for (let index = 0; index < normalized.length; index += 1) {
    const branch = normalized[index]
    const prefix = `branch${index + 1}`
    merged[prefix] = branch

    for (const [key, value] of Object.entries(branch)) {
      if (!(key in merged)) {
        merged[key] = value
        continue
      }
      if (merged[key] !== value) {
        merged[`${prefix}_${key}`] = value
      }
    }
  }

  return mergePayload(merged, {
    mergedAt: new Date().toISOString(),
    mergeSourceCount: normalized.length,
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