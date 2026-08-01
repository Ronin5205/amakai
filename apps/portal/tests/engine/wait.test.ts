import {
  resumePlaygroundValidation,
  runPlaygroundValidation,
} from "@/lib/engine/playground"
import { sequentialEdge, triggerNode, waitNode } from "@/tests/fixtures/workflow-fixtures"

describe("wait pause and resume", () => {
  it("pauses at wait nodes until the duration elapses", async () => {
    const trigger = triggerNode("trigger-1", ["status"])
    const wait = waitNode("wait-1", 250)
    const edges = [sequentialEdge(trigger, wait)]

    const paused = await runPlaygroundValidation([trigger, wait], edges)

    expect(paused.passed).toBe(false)
    expect(paused.pendingWait?.nodeId).toBe("wait-1")
    expect(paused.pendingWait?.durationMs).toBe(250)
    expect(paused.continuation?.pending.kind).toBe("wait")
    expect(paused.steps.some((step) => step.type === "pending_wait")).toBe(true)

    const resumed = await resumePlaygroundValidation(
      [trigger, wait],
      edges,
      paused.continuation!,
      { type: "wait" }
    )

    expect(resumed.passed).toBe(true)
    expect(
      resumed.steps.some((step) => step.log.message.includes("Waited 250ms"))
    ).toBe(true)
  })
})
