import { runPlaygroundValidation, resumePlaygroundValidation } from "@/lib/engine/playground"
import {
  sequentialEdge,
  triggerNode,
  workflowNode,
} from "@/tests/fixtures/workflow-fixtures"

function approvalNode(id: string, config: Record<string, unknown> = {}) {
  return workflowNode({
    id,
    kind: "approval",
    label: "Approval",
    config: {
      catalogItemId: "approval.base",
      ...config,
    },
    position: { x: 240, y: 0 },
  })
}

describe("approval pause and resume", () => {
  it("pauses at approval nodes until a decision is provided", async () => {
    const trigger = triggerNode("trigger-1", ["amount"])
    const approval = approvalNode("approval-1", {
      approverType: "manual",
    })
    const edges = [sequentialEdge(trigger, approval)]

    const paused = await runPlaygroundValidation([trigger, approval], edges)

    expect(paused.passed).toBe(false)
    expect(paused.pendingApproval?.nodeId).toBe("approval-1")
    expect(paused.continuation).toBeDefined()
    expect(
      paused.steps.some((step) => step.type === "pending_approval")
    ).toBe(true)

    const resumed = await resumePlaygroundValidation(
      [trigger, approval],
      edges,
      paused.continuation!,
      { type: "approval", decision: "approved" }
    )

    expect(resumed.passed).toBe(true)
    expect(
      resumed.steps.some((step) =>
        step.log.message.includes("Approved (Manual approval in portal)")
      )
    ).toBe(true)
  })

  it("requires an email when approval type is email", async () => {
    const trigger = triggerNode("trigger-1", ["amount"])
    const approval = approvalNode("approval-1", {
      approverType: "email",
    })
    const edges = [sequentialEdge(trigger, approval)]

    const result = await runPlaygroundValidation([trigger, approval], edges)

    expect(result.passed).toBe(false)
    expect(result.errorMessage).toMatch(/approver email/i)
  })
})
