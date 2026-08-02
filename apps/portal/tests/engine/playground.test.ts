jest.mock("@/lib/actions/playground-data-table-actions", () => ({
  playgroundDataTableReadAction: jest.fn(),
  playgroundDataTableWriteAction: jest.fn(),
}))

import {
  playgroundDataTableReadAction,
  playgroundDataTableWriteAction,
} from "@/lib/actions/playground-data-table-actions"
import { runPlaygroundValidation } from "@/lib/engine/playground"
import {
  dataTableNode,
  loopOverItemsNode,
  sequentialEdge,
  triggerNode,
  workflowNode,
} from "@/tests/fixtures/workflow-fixtures"
import { createEdge } from "@/lib/design/workflow-graph"

const mockedWrite = playgroundDataTableWriteAction as jest.MockedFunction<
  typeof playgroundDataTableWriteAction
>
const mockedRead = playgroundDataTableReadAction as jest.MockedFunction<
  typeof playgroundDataTableReadAction
>

describe("runPlaygroundValidation", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("fails when the workflow has no trigger", async () => {
    const action = dataTableNode("write-1")
    const result = await runPlaygroundValidation([action], [])

    expect(result.passed).toBe(false)
    expect(result.errorMessage).toMatch(/trigger/i)
  })

  it("runs a trigger and write data-table flow with populated row data", async () => {
    mockedWrite.mockResolvedValue({
      row: {
        id: "row-1",
        tableId: "table-1",
        data: {
          name: "Demo Contact",
          email: "demo@example.com",
          status: "active",
        },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      tableName: "demo_contacts",
    })

    const trigger = triggerNode("trigger-1", ["name", "email", "status"])
    const write = dataTableNode("write-1", {
      operation: "write",
      tableName: "demo_contacts",
      columnMappings: [
        { columnKey: "name", sourceField: "trigger-1.name" },
        { columnKey: "email", sourceField: "trigger-1.email" },
        { columnKey: "status", sourceField: "trigger-1.status" },
      ],
    })
    const edges = [sequentialEdge(trigger, write)]

    const result = await runPlaygroundValidation([trigger, write], edges)

    expect(result.passed).toBe(true)
    expect(mockedWrite).toHaveBeenCalledWith(
      "demo_contacts",
      {
        name: "Demo Contact",
        email: "demo1@example.com",
        status: "active",
      },
      {
        writeMode: "insert",
        matchColumn: "",
        matchValue: undefined,
      }
    )
    expect(
      result.steps.some((step) =>
        step.log.message.includes('Wrote 1 row (3 field(s)) to "demo_contacts"')
      )
    ).toBe(true)
  })

  it("fails data-table write when mapped values are empty", async () => {
    const trigger = triggerNode("trigger-1", ["status"])
    const write = dataTableNode("write-1", {
      operation: "write",
      tableName: "demo_contacts",
      columnMappings: [
        { columnKey: "name", sourceField: "trigger-1.name" },
      ],
    })
    const edges = [sequentialEdge(trigger, write)]

    const result = await runPlaygroundValidation([trigger, write], edges)

    expect(result.passed).toBe(false)
    expect(result.errorMessage).toMatch(/could not resolve any values/i)
    expect(mockedWrite).not.toHaveBeenCalled()
  })

  it("reads rows from a data table during validation", async () => {
    mockedRead.mockResolvedValue({
      rows: [
        {
          id: "row-1",
          tableId: "table-1",
          data: { name: "Demo Contact" },
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ],
      tableName: "demo_contacts",
    })

    const trigger = triggerNode("trigger-1")
    const read = dataTableNode("read-1", {
      operation: "read",
      tableName: "demo_contacts",
    })
    const edges = [sequentialEdge(trigger, read)]

    const result = await runPlaygroundValidation([trigger, read], edges)

    expect(result.passed).toBe(true)
    expect(mockedRead).toHaveBeenCalledWith("demo_contacts")
    expect(
      result.steps.some((step) =>
        step.log.message.includes('Read 1 row(s) from "demo_contacts"')
      )
    ).toBe(true)
  })

  it("iterates loop over items using array trigger payloads", async () => {
    const trigger = workflowNode({
      id: "trigger-1",
      kind: "trigger",
      label: "Trigger",
      config: {
        catalogItemId: "trigger.workflow",
        triggerType: "manual",
        outputFields: ["orders"],
        outputFieldDefs: [{ name: "orders", type: "array" }],
      },
      position: { x: 0, y: 0 },
    })
    const loop = loopOverItemsNode("loop-1", "trigger-1.orders")
    const action = workflowNode({
      id: "action-1",
      kind: "sequential",
      label: "Handle item",
      config: { catalogItemId: "action.code", code: "return item;" },
      position: { x: 480, y: 0 },
    })

    const edges = [
      sequentialEdge(trigger, loop),
      sequentialEdge(loop, action, { sourcePort: "loop", targetPort: "main-in" }),
    ]

    const result = await runPlaygroundValidation([trigger, loop, action], edges, {
      triggerPayloads: {
        "trigger-1": {
          orders: [{ orderId: "1" }, { orderId: "2" }],
        },
      },
      capturePayloads: true,
    })

    expect(result.passed).toBe(true)
    expect(
      result.steps.some((step) =>
        step.log.message.includes("Looping over 2 item(s)")
      )
    ).toBe(true)
    expect(
      result.steps.filter(
        (step) =>
          step.type === "node_exit" &&
          step.log.nodeLabel === "Handle item" &&
          step.inputPayload &&
          typeof step.inputPayload === "object" &&
          (step.inputPayload as { loopIndex?: number }).loopIndex !== undefined
      )
    ).toHaveLength(2)
  })

  it("routes IF to false when the comparison fails", async () => {
    const trigger = triggerNode("trigger-1", ["status"])
    const iff = workflowNode({
      id: "if-1",
      kind: "conditional",
      label: "Check status",
      config: {
        catalogItemId: "condition.if",
        field: "trigger-1.status",
        operator: "equals",
        compareValue: "active",
      },
      position: { x: 240, y: 0 },
    })
    const trueBranch = workflowNode({
      id: "true-1",
      kind: "sequential",
      label: "True path",
      config: { catalogItemId: "action.code", code: "true" },
      position: { x: 480, y: 0 },
    })
    const falseBranch = workflowNode({
      id: "false-1",
      kind: "sequential",
      label: "False path",
      config: { catalogItemId: "action.code", code: "false" },
      position: { x: 480, y: 120 },
    })

    const edges = [
      sequentialEdge(trigger, iff),
      createEdge(iff.id, trueBranch.id, {
        sourcePort: "true",
        targetPort: "main-in",
      }),
      createEdge(iff.id, falseBranch.id, {
        sourcePort: "false",
        targetPort: "main-in",
      }),
    ]

    const result = await runPlaygroundValidation(
      [trigger, iff, trueBranch, falseBranch],
      edges,
      {
        triggerPayloads: { "trigger-1": { status: "paused" } },
      }
    )

    expect(result.passed).toBe(true)
    expect(
      result.steps.some((step) =>
        step.log.message.includes("IF evaluated → False branch")
      )
    ).toBe(true)
    expect(
      result.steps.some(
        (step) =>
          step.type === "node_exit" && step.log.nodeLabel === "False path"
      )
    ).toBe(true)
    expect(
      result.steps.some(
        (step) =>
          step.type === "node_exit" && step.log.nodeLabel === "True path"
      )
    ).toBe(false)
  })

  it("drops filtered payloads instead of continuing downstream", async () => {
    const trigger = triggerNode("trigger-1", ["status"])
    const filter = workflowNode({
      id: "filter-1",
      kind: "conditional",
      label: "Keep active",
      config: {
        catalogItemId: "condition.filter",
        field: "trigger-1.status",
        operator: "equals",
        compareValue: "active",
      },
      position: { x: 240, y: 0 },
    })
    const after = workflowNode({
      id: "after-1",
      kind: "sequential",
      label: "After filter",
      config: { catalogItemId: "action.code", code: "ok" },
      position: { x: 480, y: 0 },
    })

    const edges = [
      sequentialEdge(trigger, filter),
      createEdge(filter.id, after.id, {
        sourcePort: "matching-items",
        targetPort: "main-in",
      }),
    ]

    const dropped = await runPlaygroundValidation(
      [trigger, filter, after],
      edges,
      { triggerPayloads: { "trigger-1": { status: "paused" } } }
    )
    expect(dropped.passed).toBe(true)
    expect(
      dropped.steps.some((step) =>
        step.log.message.includes("Filter dropped payload")
      )
    ).toBe(true)
    expect(
      dropped.steps.some(
        (step) =>
          step.type === "node_exit" && step.log.nodeLabel === "After filter"
      )
    ).toBe(false)

    const kept = await runPlaygroundValidation(
      [trigger, filter, after],
      edges,
      { triggerPayloads: { "trigger-1": { status: "active" } } }
    )
    expect(kept.passed).toBe(true)
    expect(
      kept.steps.some((step) => step.log.message.includes("Filter kept payload"))
    ).toBe(true)
    expect(
      kept.steps.some(
        (step) =>
          step.type === "node_exit" && step.log.nodeLabel === "After filter"
      )
    ).toBe(true)
  })

  it("fires loop done only after loop body nodes finish", async () => {
    const trigger = workflowNode({
      id: "trigger-1",
      kind: "trigger",
      label: "Trigger",
      config: {
        catalogItemId: "trigger.workflow",
        triggerType: "manual",
        outputFields: ["orders"],
        outputFieldDefs: [{ name: "orders", type: "array" }],
      },
      position: { x: 0, y: 0 },
    })
    const loop = loopOverItemsNode("loop-1", "trigger-1.orders")
    const body = workflowNode({
      id: "body-1",
      kind: "sequential",
      label: "Body",
      config: { catalogItemId: "action.code", code: "body" },
      position: { x: 480, y: 0 },
    })
    const afterDone = workflowNode({
      id: "done-1",
      kind: "sequential",
      label: "After done",
      config: { catalogItemId: "action.code", code: "done" },
      position: { x: 480, y: 120 },
    })

    const edges = [
      sequentialEdge(trigger, loop),
      sequentialEdge(loop, body, { sourcePort: "loop", targetPort: "main-in" }),
      sequentialEdge(loop, afterDone, {
        sourcePort: "done",
        targetPort: "main-in",
      }),
    ]

    const result = await runPlaygroundValidation(
      [trigger, loop, body, afterDone],
      edges,
      {
        triggerPayloads: {
          "trigger-1": { orders: [{ id: 1 }, { id: 2 }] },
        },
      }
    )

    expect(result.passed).toBe(true)

    const exitLabels = result.steps
      .filter((step) => step.type === "node_exit")
      .map((step) => step.log.nodeLabel)

    const lastBodyIndex = exitLabels.lastIndexOf("Body")
    const doneIndex = exitLabels.indexOf("After done")
    expect(lastBodyIndex).toBeGreaterThanOrEqual(0)
    expect(doneIndex).toBeGreaterThan(lastBodyIndex)
  })
})
