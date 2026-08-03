import { buildTriggerPlaygroundPayload } from "@/lib/engine/playground-data-table"
import {
  normalizeCollection,
  resolveCollectionFromField,
} from "@/lib/engine/loop-collection"
import { workflowNode } from "@/tests/fixtures/workflow-fixtures"

describe("loop-collection", () => {
  it("normalizes arrays, objects, and comma-separated strings", () => {
    expect(normalizeCollection([1, 2])).toEqual([1, 2])
    expect(normalizeCollection({ id: 1 })).toEqual([{ id: 1 }])
    expect(normalizeCollection("a, b, c")).toEqual(["a", "b", "c"])
    expect(normalizeCollection('[{"id":"1"}]')).toEqual([{ id: "1" }])
  })

  it("resolves collection fields from payload", () => {
    const payload = {
      orders: [{ orderId: "1" }, { orderId: "2" }],
    }

    expect(resolveCollectionFromField(payload, "trigger-1.orders")).toEqual([
      { orderId: "1" },
      { orderId: "2" },
    ])
  })
})

describe("array trigger payloads", () => {
  it("seeds array output fields with sample collections", () => {
    const node = workflowNode({
      id: "trigger-1",
      kind: "trigger",
      label: "Trigger",
      config: {
        catalogItemId: "trigger.workflow",
        triggerType: "manual",
        outputFields: ["runKey", "orders"],
        outputFieldDefs: [
          { name: "runKey", type: "string" },
          { name: "orders", type: "array" },
        ],
      },
    })

    const payload = buildTriggerPlaygroundPayload(node)

    expect(payload.runKey).toBe("sample_runKey")
    expect(Array.isArray(payload.orders)).toBe(true)
    expect(payload.orders).toHaveLength(2)
  })
})
