import {
  isComparisonOperator,
  type ComparisonOperator,
} from "@/lib/design/comparison-rules"

export type SwitchCaseRule = {
  portId: string
  label: string
  field: string
  operator: ComparisonOperator
  compareValue: string
}

export function isSwitchDefaultCase(rule: SwitchCaseRule) {
  return rule.portId === "default"
}

function parseSwitchCaseRule(entry: unknown): SwitchCaseRule | null {
  if (typeof entry !== "object" || entry === null) {
    return null
  }

  const rule = entry as Record<string, unknown>
  if (typeof rule.portId !== "string" || typeof rule.label !== "string") {
    return null
  }

  if (rule.portId === "default") {
    return {
      portId: "default",
      label: rule.label,
      field: "",
      operator: "equals",
      compareValue: "",
    }
  }

  const operator = isComparisonOperator(rule.operator) ? rule.operator : "equals"

  return {
    portId: rule.portId,
    label: rule.label,
    field: typeof rule.field === "string" ? rule.field : "",
    operator,
    compareValue:
      typeof rule.compareValue === "string"
        ? rule.compareValue
        : typeof rule.condition === "string"
          ? rule.condition
          : "",
  }
}

export function buildDefaultSwitchCases(caseCount: number, includeDefault: boolean) {
  const cases: SwitchCaseRule[] = Array.from({ length: caseCount }, (_, index) => {
    const caseNumber = index + 1
    return {
      portId: `case-${caseNumber}`,
      label: `Case ${caseNumber}`,
      field: "",
      operator: "equals" as const,
      compareValue: "",
    }
  })

  if (includeDefault) {
    cases.push({
      portId: "default",
      label: "Fallback",
      field: "",
      operator: "equals",
      compareValue: "",
    })
  }

  return cases
}

export function normalizeSwitchCases(
  value: unknown,
  caseCount: number,
  includeDefault: boolean
): SwitchCaseRule[] {
  const expected = buildDefaultSwitchCases(caseCount, includeDefault)

  if (!Array.isArray(value)) {
    return expected
  }

  const parsed = value
    .map(parseSwitchCaseRule)
    .filter((entry): entry is SwitchCaseRule => entry !== null)

  return expected.map((rule) => {
    const existing = parsed.find((entry) => entry.portId === rule.portId)
    return existing ?? rule
  })
}

export function validateSwitchCaseRules(node: {
  config: Record<string, unknown>
}) {
  const caseCount = Math.max(2, Number(node.config.caseCount ?? 2))
  const includeDefault = node.config.includeDefaultOutput === true
  const rules = normalizeSwitchCases(
    node.config.switchCases,
    caseCount,
    includeDefault
  )

  for (const rule of rules) {
    if (isSwitchDefaultCase(rule)) {
      continue
    }

    if (!rule.field.trim()) {
      return {
        ok: false as const,
        message: `Switch ${rule.label} is missing a field from the previous node`,
      }
    }

    if (!rule.compareValue.trim()) {
      return {
        ok: false as const,
        message: `Switch ${rule.label} is missing a comparison value`,
      }
    }
  }

  return { ok: true as const, rules }
}
