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
  sequentialEdge,
  triggerNode,
} from "@/tests/fixtures/workflow-fixtures"

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
    expect(mockedWrite).toHaveBeenCalledWith("demo_contacts", {
      name: "Demo Contact",
      email: "demo1@example.com",
      status: "active",
    })
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
})
