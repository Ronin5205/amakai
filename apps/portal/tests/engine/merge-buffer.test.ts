import { createEdge } from "@/lib/design/workflow-graph"
import {
  createMergeBuffer,
  handleMergeNodeArrival,
} from "@/lib/engine/merge-buffer"
import { mergeManyBranchPayloads } from "@/lib/engine/payload-transforms"
import { workflowNode } from "@/tests/fixtures/workflow-fixtures"

describe("merge-buffer N inputs", () => {
  it("waits for all three configured inputs before ready", () => {
    const merge = workflowNode({
      id: "merge-1",
      kind: "sequential",
      label: "Combine",
      config: { catalogItemId: "action.merge", inputCount: 3 },
      position: { x: 0, y: 0 },
    })
    const buffers = createMergeBuffer()

    const edge1 = createEdge("a", merge.id, {
      sourcePort: "main-out",
      targetPort: "input-1",
    })
    const edge2 = createEdge("b", merge.id, {
      sourcePort: "main-out",
      targetPort: "input-2",
    })
    const edge3 = createEdge("c", merge.id, {
      sourcePort: "main-out",
      targetPort: "input-3",
    })
    const edges = [edge1, edge2, edge3]

    const first = handleMergeNodeArrival(
      merge,
      { a: 1 },
      edges,
      edge1.id,
      buffers
    )
    expect(first.status).toBe("waiting")
    if (first.status === "waiting") {
      expect(first.received).toBe(1)
      expect(first.expected).toBe(3)
    }

    const second = handleMergeNodeArrival(
      merge,
      { b: 2 },
      edges,
      edge2.id,
      buffers
    )
    expect(second.status).toBe("waiting")

    const third = handleMergeNodeArrival(
      merge,
      { c: 3 },
      edges,
      edge3.id,
      buffers
    )
    expect(third.status).toBe("ready")
  })

  it("maps legacy input-a / input-b ports to input-1 / input-2", () => {
    const merge = workflowNode({
      id: "merge-1",
      kind: "sequential",
      label: "Combine",
      config: { catalogItemId: "action.merge" },
      position: { x: 0, y: 0 },
    })
    const buffers = createMergeBuffer()
    const edgeB = createEdge("b", merge.id, {
      sourcePort: "main-out",
      targetPort: "input-b",
    })

    expect(
      handleMergeNodeArrival(merge, { a: 1 }, [], undefined, buffers).status
    ).toBe("waiting")

    const ready = handleMergeNodeArrival(
      merge,
      { b: 2 },
      [edgeB],
      edgeB.id,
      buffers
    )
    expect(ready.status).toBe("ready")
  })
})

describe("mergeManyBranchPayloads", () => {
  it("folds three branch payloads", () => {
    const merged = mergeManyBranchPayloads([
      { userId: "u-1" },
      { plan: "pro" },
      { region: "emea" },
    ]) as Record<string, unknown>

    expect(merged.userId).toBe("u-1")
    expect(merged.plan).toBe("pro")
    expect(merged.region).toBe("emea")
    expect(merged.mergeSourceCount).toBe(3)
    expect(Array.isArray(merged.branches)).toBe(true)
  })
})
