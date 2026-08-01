import type { WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import { getCatalogItemId } from "@/lib/design/component-variant-definitions"
import { mergeBranchPayloads } from "@/lib/engine/payload-transforms"

export type MergeBranchPort = "input-a" | "input-b"

export type MergeBuffer = Map<
  string,
  Partial<Record<MergeBranchPort, unknown>>
>

export function createMergeBuffer() {
  return new Map<string, Partial<Record<MergeBranchPort, unknown>>>()
}

export function resolveMergeTargetPort(
  edges: WorkflowEdge[],
  viaEdgeId?: string
): MergeBranchPort {
  if (!viaEdgeId) {
    return "input-a"
  }

  const edge = edges.find((entry) => entry.id === viaEdgeId)
  return edge?.targetPort === "input-b" ? "input-b" : "input-a"
}

export type MergeArrivalResult =
  | { status: "not-merge" }
  | { status: "waiting"; port: MergeBranchPort }
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

  const port = resolveMergeTargetPort(edges, viaEdgeId)
  const buffer = mergeBuffers.get(node.id) ?? {}
  buffer[port] = payload
  mergeBuffers.set(node.id, buffer)

  if (!buffer["input-a"] || !buffer["input-b"]) {
    return { status: "waiting", port }
  }

  mergeBuffers.delete(node.id)

  return {
    status: "ready",
    payload: mergeBranchPayloads(buffer["input-a"], buffer["input-b"]),
  }
}
