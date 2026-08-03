import {
  buildSequentialEdges,
  cloneWorkflowGraph,
  createEdge,
  sanitizeManualEdge,
} from "@/lib/design/workflow-graph"
import { triggerNode, workflowNode } from "@/tests/fixtures/workflow-fixtures"

describe("workflow-graph", () => {
  const trigger = triggerNode("trigger-1")
  const action = workflowNode({
    id: "action-1",
    kind: "sequential",
    label: "Code",
    config: { catalogItemId: "action.code" },
  })

  it("creates sequential edges between nodes", () => {
    const edges = buildSequentialEdges([trigger, action])

    expect(edges).toHaveLength(1)
    expect(edges[0]?.source).toBe(trigger.id)
    expect(edges[0]?.target).toBe(action.id)
  })

  it("sanitizes manual edges with default ports", () => {
    const edge = sanitizeManualEdge([], trigger, action)

    expect(edge).toMatchObject({
      source: trigger.id,
      target: action.id,
      sourcePort: "main-out",
      targetPort: "main-in",
    })
  })

  it("rejects self-loops and duplicate edges", () => {
    const existing = [
      createEdge(trigger.id, action.id, {
        sourcePort: "main-out",
        targetPort: "main-in",
      }),
    ]

    expect(sanitizeManualEdge([], trigger, trigger)).toBeNull()
    expect(sanitizeManualEdge(existing, trigger, action)).toBeNull()
  })

  it("clones graphs with remapped node ids and upstream refs", () => {
    const actionWithMapping = workflowNode({
      id: "action-1",
      kind: "sequential",
      label: "Edit fields",
      config: {
        catalogItemId: "action.edit-fields",
        fieldEdits: [{ name: "total", sourceField: "trigger-1.amount" }],
      },
    })

    const cloned = cloneWorkflowGraph(
      [trigger, actionWithMapping],
      [createEdge(trigger.id, actionWithMapping.id)]
    )

    expect(cloned.nodes).toHaveLength(2)
    expect(cloned.nodes[0]?.id).not.toBe(trigger.id)
    expect(cloned.edges[0]?.source).toBe(cloned.nodes[0]?.id)

    const clonedAction = cloned.nodes[1]
    const clonedTriggerId = cloned.nodes[0]?.id
    expect(clonedAction?.config.fieldEdits).toEqual([
      { name: "total", sourceField: `${clonedTriggerId}.amount` },
    ])
  })
})
