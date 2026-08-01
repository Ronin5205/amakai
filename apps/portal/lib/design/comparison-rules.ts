import { readJsonPath } from "@/lib/design/json-value"
import { upstreamFieldRefToJsonPath } from "@/lib/design/node-payload"

export const COMPARISON_OPERATORS = [
  { label: "equals", value: "equals" },
  { label: "not equals", value: "not_equals" },
  { label: "greater than", value: "greater_than" },
  { label: "less than", value: "less_than" },
  { label: "contains", value: "contains" },
] as const

export type ComparisonOperator = (typeof COMPARISON_OPERATORS)[number]["value"]

export function isComparisonOperator(value: unknown): value is ComparisonOperator {
  return COMPARISON_OPERATORS.some((entry) => entry.value === value)
}

function coerceCompareValue(raw: string): unknown {
  const trimmed = raw.trim()
  if (trimmed === "") {
    return ""
  }

  if (trimmed === "true") {
    return true
  }
  if (trimmed === "false") {
    return false
  }
  if (trimmed === "null") {
    return null
  }

  const asNumber = Number(trimmed)
  if (!Number.isNaN(asNumber) && trimmed !== "") {
    return asNumber
  }

  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return trimmed
  }
}

function compareValues(
  left: unknown,
  operator: ComparisonOperator,
  right: unknown
): boolean {
  if (operator === "equals") {
    return left === right || String(left ?? "") === String(right ?? "")
  }

  if (operator === "not_equals") {
    return left !== right && String(left ?? "") !== String(right ?? "")
  }

  if (operator === "contains") {
    if (Array.isArray(left)) {
      return left.some(
        (entry) =>
          entry === right || String(entry ?? "") === String(right ?? "")
      )
    }

    return String(left ?? "")
      .toLowerCase()
      .includes(String(right ?? "").toLowerCase())
  }

  const leftNumber = Number(left)
  const rightNumber = Number(right)

  if (operator === "greater_than") {
    if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
      return leftNumber > rightNumber
    }
    return String(left ?? "") > String(right ?? "")
  }

  if (operator === "less_than") {
    if (!Number.isNaN(leftNumber) && !Number.isNaN(rightNumber)) {
      return leftNumber < rightNumber
    }
    return String(left ?? "") < String(right ?? "")
  }

  return false
}

export function evaluateComparisonRule(
  payload: unknown,
  fieldRef: string,
  operator: unknown,
  compareValue: string
) {
  if (!fieldRef.trim()) {
    return false
  }

  const resolvedOperator = isComparisonOperator(operator) ? operator : "equals"
  const jsonPath =
    upstreamFieldRefToJsonPath(fieldRef) ??
    (fieldRef.includes(".")
      ? fieldRef.slice(fieldRef.indexOf(".") + 1)
      : fieldRef)
  const actual = readJsonPath(payload, jsonPath)
  const expected = coerceCompareValue(compareValue)

  return compareValues(actual, resolvedOperator, expected)
}

export function formatComparisonSummary(
  fieldRef: string,
  operator: unknown,
  compareValue: string
) {
  const operatorLabel =
    COMPARISON_OPERATORS.find((entry) => entry.value === operator)?.label ??
    "equals"

  const fieldLabel = fieldRef.includes(".")
    ? fieldRef.slice(fieldRef.indexOf(".") + 1)
    : fieldRef

  return `${fieldLabel} ${operatorLabel} ${compareValue}`.trim()
}
