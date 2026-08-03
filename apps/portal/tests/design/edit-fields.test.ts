import { buildEditFieldPorts, normalizeFieldEditRows } from "@/lib/design/edit-fields"
import { workflowNode } from "../fixtures/workflow-fixtures"

describe("edit-fields", () => {
  it("builds paired input and output ports for each mapping row", () => {
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

    expect(inputs.map((port) => port.id)).toEqual(["input-1", "input-2"])
    expect(outputs.map((port) => port.id)).toEqual(["output-1", "output-2"])
    expect(inputs[0]?.required).toBe(true)
    expect(inputs[1]?.required).toBe(false)
    expect(outputs[0]?.label).toBe("total")
    expect(outputs[1]?.label).toBe("currency")
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
