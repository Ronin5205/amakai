import type { WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import {
  getCatalogItemId,
  getMergeInputCount,
  mergePortId,
  normalizeMergePortId,
} from "@/lib/design/component-variant-definitions"
import { mergeManyBranchPayloads } from "@/lib/engine/payload-transforms"

export type MergeBuffer = Map<string, Record<string, unknown>>

export function createMergeBuffer() {
  return new Map<string, Record<string, unknown>>()
}

export function resolveMergeTargetPort(
  edges: WorkflowEdge[],
  viaEdgeId?: string
): string {
  if (!viaEdgeId) {
    return mergePortId(1)
  }

  const edge = edges.find((entry) => entry.id === viaEdgeId)
  return normalizeMergePortId(edge?.targetPort)
}

export type MergeArrivalResult =
  | { status: "not-merge" }
  | { status: "waiting"; port: string; received: number; expected: number }
  | { status: "ready"; payload: unknown }

export function handleMergeNodeArrival(
  node: WorkflowNode,
  payload: unknown,
  edges: WorkflowEdge[],
  viaEdgeId: string | undefined,
  mergeBuffers: MergeBuffer
): MergeArrivalResult {
  if (getCatalogItemId(node) !== "action.merge") {
    return { status: "not-merge" }
  }

  const expected = getMergeInputCount(node)
  const port = resolveMergeTargetPort(edges, viaEdgeId)
  const buffer = mergeBuffers.get(node.id) ?? {}
  buffer[port] = payload
  mergeBuffers.set(node.id, buffer)

  const received = Object.keys(buffer).length
  const ready = Array.from({ length: expected }, (_, index) =>
    mergePortId(index + 1)
  ).every((portId) => portId in buffer)

  if (!ready) {
    return { status: "waiting", port, received, expected }
  }

  mergeBuffers.delete(node.id)

  const branches = Array.from({ length: expected }, (_, index) => {
    return buffer[mergePortId(index + 1)]
  })

  return {
    status: "ready",
    payload: mergeManyBranchPayloads(branches),
  }
}

export function hasMergeInputConnected(
  edges: WorkflowEdge[],
  node: WorkflowNode,
  inputIndex: number
) {
  const modern = mergePortId(inputIndex)
  return edges.some((edge) => {
    if (edge.target !== node.id) {
      return false
    }
    return normalizeMergePortId(edge.targetPort) === modern
  })
}
