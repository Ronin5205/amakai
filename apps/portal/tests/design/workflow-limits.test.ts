import { buildWorkflowLimitState, workflowLimitReachedMessage } from "@/lib/data/workflow-limits"
import { WORKFLOW_LIMIT_BY_PLAN } from "@/lib/data/plan-limits"

describe("workflow-limits", () => {
  it("allows creation below the cap", () => {
    expect(buildWorkflowLimitState(9, WORKFLOW_LIMIT_BY_PLAN.free)).toEqual({
      count: 9,
      limit: 10,
      canCreate: true,
    })
  })

  it("blocks creation at the cap", () => {
    expect(buildWorkflowLimitState(10, WORKFLOW_LIMIT_BY_PLAN.free)).toEqual({
      count: 10,
      limit: 10,
      canCreate: false,
    })
  })

  it("returns a clear limit message", () => {
    expect(workflowLimitReachedMessage(10)).toMatch(/10 workflows per account/)
  })
})
