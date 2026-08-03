import {
  aggregateItemsByField,
  mergeBranchPayloads,
} from "@/lib/engine/payload-transforms"
import { handleMergeNodeArrival, createMergeBuffer } from "@/lib/engine/merge-buffer"
import { runPlaygroundValidation } from "@/lib/engine/playground"
import {
  sequentialEdge,
  triggerNode,
  workflowNode,
} from "@/tests/fixtures/workflow-fixtures"
import { createEdge } from "@/lib/design/workflow-graph"

describe("payload-transforms", () => {
  it("merges two branch payloads into one combined object", () => {
    const merged = mergeBranchPayloads(
      { userId: "u-1", email: "a@test.com" },
      { plan: "pro", status: "active" }
    ) as Record<string, unknown>

    expect(merged.userId).toBe("u-1")
    expect(merged.plan).toBe("pro")
    expect(merged.branchA).toEqual({ userId: "u-1", email: "a@test.com" })
    expect(merged.branchB).toEqual({ plan: "pro", status: "active" })
    expect(merged.mergeSourceCount).toBe(2)
  })

  it("groups list items by a field", () => {
    const result = aggregateItemsByField(
      {
        dataTableRows: [
          { email: "work@company.com", type: "work" },
          { email: "work@company.com", type: "work" },
          { email: "personal@gmail.com", type: "personal" },
        ],
      },
      "email"
    ) as Record<string, unknown>

    expect(result.itemCount).toBe(3)
    expect(result.groupCount).toBe(2)
    expect(result.aggregatedBy).toBe("email")
  })
})

describe("combine branches playground", () => {
  it("waits for both branches before continuing", async () => {
    const trigger = triggerNode("trigger-1", ["userId"])
    const branchA = workflowNode({
      id: "branch-a",
      kind: "sequential",
      label: "Branch A",
      config: { catalogItemId: "action.code", code: "a" },
      position: { x: 240, y: 0 },
    })
    const branchB = workflowNode({
      id: "branch-b",
      kind: "sequential",
      label: "Branch B",
      config: { catalogItemId: "action.code", code: "b" },
      position: { x: 240, y: 120 },
    })
    const merge = workflowNode({
      id: "merge-1",
      kind: "sequential",
      label: "Combine Branches",
      config: { catalogItemId: "action.merge" },
      position: { x: 480, y: 60 },
    })

    const edges = [
      sequentialEdge(trigger, branchA),
      sequentialEdge(trigger, branchB),
      createEdge(branchA.id, merge.id, { sourcePort: "main-out", targetPort: "input-a" }),
      createEdge(branchB.id, merge.id, { sourcePort: "main-out", targetPort: "input-b" }),
    ]

    const result = await runPlaygroundValidation(
      [trigger, branchA, branchB, merge],
      edges
    )

    expect(result.passed).toBe(true)
    expect(
      result.steps.some((step) =>
        step.log.message.includes("Combined both branch payloads")
      )
    ).toBe(true)
  })
})

describe("merge buffer", () => {
  it("buffers until both ports arrive", () => {
    const merge = workflowNode({
      id: "merge-1",
      kind: "sequential",
      label: "Combine",
      config: { catalogItemId: "action.merge" },
      position: { x: 0, y: 0 },
    })
    const buffers = createMergeBuffer()

    const first = handleMergeNodeArrival(
      merge,
      { a: 1 },
      [],
      undefined,
      buffers
    )
    expect(first.status).toBe("waiting")

    const inputBEdge = createEdge("branch-b", merge.id, {
      sourcePort: "main-out",
      targetPort: "input-b",
    })

    const second = handleMergeNodeArrival(
      merge,
      { b: 2 },
      [inputBEdge],
      inputBEdge.id,
      buffers
    )
    expect(second.status).toBe("ready")
  })
})
