import {
  applyFieldEditsToPayload,
  applyRenamesToPayload,
  buildDataTableRowFromPayload,
  buildTriggerPlaygroundPayload,
  countPopulatedRowFields,
  mergePayload,
  resolvePayloadField,
} from "@/lib/engine/playground-data-table"
import { workflowNode } from "@/tests/fixtures/workflow-fixtures"

describe("playground-data-table", () => {
  describe("resolvePayloadField", () => {
    it("resolves bare and node-qualified field names", () => {
      const payload = { name: "Ada", email: "ada@example.com" }

      expect(resolvePayloadField(payload, "name")).toBe("Ada")
      expect(resolvePayloadField(payload, "node-1.name")).toBe("Ada")
    })

    it("returns undefined for missing fields", () => {
      expect(resolvePayloadField({ name: "Ada" }, "email")).toBeUndefined()
      expect(resolvePayloadField(null, "name")).toBeUndefined()
    })
  })

  describe("buildTriggerPlaygroundPayload", () => {
    it("seeds declared output fields with sample values", () => {
      const node = workflowNode({
        id: "trigger-1",
        kind: "trigger",
        label: "Trigger",
        config: {
          catalogItemId: "trigger.workflow",
          triggerType: "manual",
          outputFields: ["name", "email", "status"],
        },
      })

      const payload = buildTriggerPlaygroundPayload(node)

      expect(payload.name).toBe("Demo Contact")
      expect(payload.email).toBe("demo1@example.com")
      expect(payload.status).toBe("active")
      expect(payload.triggerType).toBe("manual")
      expect(payload.playground).toBe(true)
    })
  })

  describe("buildDataTableRowFromPayload", () => {
    it("maps upstream payload fields into table columns", () => {
      const payload = {
        name: "Demo Contact",
        email: "demo@example.com",
        status: "active",
      }

      const row = buildDataTableRowFromPayload(payload, [
        { columnKey: "name", sourceField: "trigger-1.name" },
        { columnKey: "email", sourceField: "trigger-1.email" },
        { columnKey: "status", sourceField: "trigger-1.status" },
      ])

      expect(row).toEqual({
        name: "Demo Contact",
        email: "demo@example.com",
        status: "active",
      })
    })

    it("skips undefined mapped values", () => {
      const row = buildDataTableRowFromPayload(
        { name: "Only name" },
        [
          { columnKey: "name", sourceField: "name" },
          { columnKey: "email", sourceField: "email" },
        ]
      )

      expect(row).toEqual({ name: "Only name" })
      expect(countPopulatedRowFields(row)).toBe(1)
    })
  })

  describe("applyFieldEditsToPayload", () => {
    it("copies values from upstream fields into new keys", () => {
      const payload = { amount: 42 }
      const node = workflowNode({
        id: "edit-1",
        kind: "sequential",
        label: "Edit fields",
        config: {
          catalogItemId: "action.edit-fields",
          fieldEdits: [{ name: "total", sourceField: "trigger-1.amount" }],
        },
      })

      expect(applyFieldEditsToPayload(payload, node)).toMatchObject({
        amount: 42,
        total: 42,
      })
    })
  })

  describe("applyRenamesToPayload", () => {
    it("renames payload keys", () => {
      const payload = { oldName: "value" }
      const node = workflowNode({
        id: "rename-1",
        kind: "sequential",
        label: "Rename keys",
        config: {
          catalogItemId: "action.rename-keys",
          renames: [{ fromField: "oldName", toField: "newName" }],
        },
      })

      expect(applyRenamesToPayload(payload, node)).toEqual({
        newName: "value",
      })
    })
  })

  describe("mergePayload", () => {
    it("merges patches onto object payloads", () => {
      expect(mergePayload({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 })
      expect(mergePayload(null, { b: 2 })).toEqual({ b: 2 })
    })
  })
})
