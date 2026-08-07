import { buildEditFieldPorts, normalizeFieldEditRows } from "@/lib/design/edit-fields"
import { workflowNode } from "../fixtures/workflow-fixtures"

describe("edit-fields", () => {
  it("uses a single sequential main-in / main-out port pair", () => {
    const node = workflowNode({
      id: "edit-1",
      kind: "sequential",
      label: "Edit fields",
      config: {
        catalogItemId: "action.edit-fields",
        fieldCount: 2,
        fieldEdits: [
          { name: "total", sourceField: "trigger-1.amount" },
          { name: "currency", sourceField: "trigger-1.currency" },
        ],
      },
    })

    const { inputs, outputs } = buildEditFieldPorts(node)

    expect(inputs.map((port) => port.id)).toEqual(["main-in"])
    expect(outputs.map((port) => port.id)).toEqual(["main-out"])
    expect(inputs[0]?.required).toBe(true)
  })

  it("pads and trims mapping rows to the configured count", () => {
    expect(
      normalizeFieldEditRows(
        [{ name: "a", sourceField: "trigger-1.a" }],
        3
      )
    ).toEqual([
      { name: "a", sourceField: "trigger-1.a" },
      { name: "", sourceField: "" },
      { name: "", sourceField: "" },
    ])
  })
})
