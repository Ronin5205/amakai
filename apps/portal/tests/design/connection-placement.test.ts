import {
  buildConnectedNodePlacement,
  filterCatalogForConnectionDraft,
  positionNodeForPortAtPoint,
} from "@/lib/design/connection-placement"
import { triggerNode, workflowNode } from "@/tests/fixtures/workflow-fixtures"

describe("connection-placement", () => {
  const trigger = triggerNode("trigger-1")

  it("filters catalog items compatible with an output draft", () => {
    const items = filterCatalogForConnectionDraft(
      { nodeId: trigger.id, side: "output", portId: "main-out" },
      trigger
    )

    expect(items.some((item) => item.id === "action.code")).toBe(true)
    expect(items.some((item) => item.id === "trigger.workflow")).toBe(false)
  })

  it("filters catalog items compatible with an input draft", () => {
    const action = workflowNode({
      id: "action-1",
      kind: "sequential",
      label: "Code",
      config: { catalogItemId: "action.code" },
    })

    const items = filterCatalogForConnectionDraft(
      { nodeId: action.id, side: "input", portId: "main-in" },
      action
    )

    expect(items.some((item) => item.id === "trigger.workflow")).toBe(true)
    expect(items.some((item) => item.id === "action.code")).toBe(true)
  })

  it("positions a node so its input port aligns with the click point", () => {
    const action = workflowNode({
      id: "action-1",
      kind: "sequential",
      label: "Code",
      config: { catalogItemId: "action.code" },
    })

    const position = positionNodeForPortAtPoint(
      action,
      "input",
      "main-in",
      { x: 400, y: 200 }
    )

    expect(position.x).toBe(400)
    expect(position.y).toBeLessThan(200)
  })

  it("builds a connected node and edge from an output draft", () => {
    const placement = buildConnectedNodePlacement(
      "action.code",
      { x: 500, y: 180 },
      { nodeId: trigger.id, side: "output", portId: "main-out" },
      trigger,
      []
    )

    expect(placement).not.toBeNull()
    expect(placement?.edge.source).toBe(trigger.id)
    expect(placement?.edge.target).toBe(placement?.node.id)
    expect(placement?.node.config.catalogItemId).toBe("action.code")
    expect(placement?.node.position).toBeDefined()
  })
})
