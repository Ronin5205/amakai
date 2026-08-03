import {
  evaluateComparisonRule,
  formatComparisonSummary,
} from "@/lib/design/comparison-rules"
import {
  normalizeSwitchCases,
  validateSwitchCaseRules,
} from "@/lib/design/switch-rules"
import { workflowNode } from "../fixtures/workflow-fixtures"

describe("comparison-rules", () => {
  it("evaluates predefined operators against payload fields", () => {
    const payload = { score: 85, email: "user@company.com" }

    expect(
      evaluateComparisonRule(payload, "trigger-1.score", "greater_than", "80")
    ).toBe(true)
    expect(
      evaluateComparisonRule(payload, "trigger-1.score", "less_than", "50")
    ).toBe(false)
    expect(
      evaluateComparisonRule(payload, "trigger-1.email", "contains", "company")
    ).toBe(true)
  })

  it("formats readable summaries", () => {
    expect(formatComparisonSummary("trigger-1.score", "greater_than", "80")).toBe(
      "score greater than 80"
    )
  })
})

describe("switch-rules", () => {
  it("validates structured case rules", () => {
    const node = workflowNode({
      id: "switch-1",
      kind: "conditional",
      label: "Route",
      config: {
        catalogItemId: "condition.switch",
        caseCount: 2,
        includeDefaultOutput: true,
        switchCases: normalizeSwitchCases(
          [
            {
              portId: "case-1",
              label: "Case 1",
              field: "trigger-1.score",
              operator: "greater_than",
              compareValue: "80",
            },
          ],
          2,
          true
        ),
      },
    })

    expect(validateSwitchCaseRules(node).ok).toBe(false)
  })
})
