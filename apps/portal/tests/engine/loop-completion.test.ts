import {
  beginLoopFanOut,
  createLoopCompletionBuffer,
  settleLoopWorkUnit,
} from "@/lib/engine/loop-completion"

describe("loop-completion", () => {
  it("fires completion only after all work units settle", () => {
    const buffer = createLoopCompletionBuffer()
    beginLoopFanOut(buffer, "loop-1", 2, 2, { loopCompleted: true })

    const first = settleLoopWorkUnit(buffer, "loop-1", 0)
    expect(first.completed).toBe(false)

    const second = settleLoopWorkUnit(buffer, "loop-1", 0)
    expect(second.completed).toBe(true)
    expect(second.tracker?.donePayload).toEqual({ loopCompleted: true })
    expect(buffer.has("loop-1")).toBe(false)
  })

  it("replaces a work unit with child work units", () => {
    const buffer = createLoopCompletionBuffer()
    beginLoopFanOut(buffer, "loop-1", 1, 1, { done: true })

    const branched = settleLoopWorkUnit(buffer, "loop-1", 2)
    expect(branched.completed).toBe(false)
    expect(buffer.get("loop-1")?.remaining).toBe(2)

    expect(settleLoopWorkUnit(buffer, "loop-1", 0).completed).toBe(false)
    expect(settleLoopWorkUnit(buffer, "loop-1", 0).completed).toBe(true)
  })
})
