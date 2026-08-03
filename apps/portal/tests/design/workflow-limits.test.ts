import {
  buildWorkflowLimitState,
  MAX_WORKFLOWS_PER_USER,
  workflowLimitReachedMessage,
} from "@/lib/data/workflow-limits"

describe("workflow-limits", () => {
  it("allows creation below the cap", () => {
    expect(buildWorkflowLimitState(9)).toEqual({
      count: 9,
      limit: MAX_WORKFLOWS_PER_USER,
      canCreate: true,
    })
  })

  it("blocks creation at the cap", () => {
    expect(buildWorkflowLimitState(10)).toEqual({
      count: 10,
      limit: MAX_WORKFLOWS_PER_USER,
      canCreate: false,
    })
  })

  it("returns a clear limit message", () => {
    expect(workflowLimitReachedMessage()).toMatch(/10 workflows per account/)
  })
})
