import {
  buildOutgoingEdgeMap,
  findTriggerNodes,
  findUnreachableNodeIds,
  getOutgoingEdges,
} from "@/lib/engine/graph-index"
import { createEdge } from "@/lib/design/workflow-graph"
import { triggerNode, workflowNode } from "@/tests/fixtures/workflow-fixtures"

describe("graph-index", () => {
  const trigger = triggerNode("trigger-1")
  const action = workflowNode({
    id: "action-1",
    kind: "sequential",
    label: "Action",
    config: { catalogItemId: "action.code" },
  })
  const orphan = workflowNode({
    id: "orphan-1",
    kind: "sequential",
    label: "Orphan",
    config: { catalogItemId: "action.code" },
  })

  const edges = [
    createEdge(trigger.id, action.id, {
      sourcePort: "main-out",
      targetPort: "main-in",
    }),
  ]

  it("finds trigger nodes", () => {
    expect(findTriggerNodes([trigger, action, orphan])).toEqual([trigger])
  })

  it("builds outgoing edge map keyed by source and port", () => {
    const map = buildOutgoingEdgeMap(edges)

    expect(map.get(`${trigger.id}:main-out`)).toEqual(edges)
  })

  it("returns outgoing edges for a node port", () => {
    const map = buildOutgoingEdgeMap(edges)

    expect(getOutgoingEdges(map, trigger, "main-out")).toEqual(edges)
    expect(getOutgoingEdges(map, action, "main-out")).toEqual([])
  })

  it("finds unreachable nodes from triggers", () => {
    expect(findUnreachableNodeIds([trigger, action, orphan], edges)).toEqual([
      orphan.id,
    ])
  })

  it("marks every node unreachable when no trigger exists", () => {
    expect(
      findUnreachableNodeIds([action, orphan], edges).sort()
    ).toEqual([action.id, orphan.id].sort())
  })
})
