import type { WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import { resolveOutputPortId } from "@/lib/design/node-layout"

export type OutgoingEdgeKey = `${string}:${string}`

export function buildOutgoingEdgeMap(edges: WorkflowEdge[]) {
  const map = new Map<string, WorkflowEdge[]>()

  for (const edge of edges) {
    const port = edge.sourcePort ?? "main-out"
    const key = `${edge.source}:${port}`
    const existing = map.get(key) ?? []
    existing.push(edge)
    map.set(key, existing)
  }

  return map
}

export function findTriggerNodes(nodes: WorkflowNode[]) {
  return nodes.filter((node) => node.kind === "trigger")
}

export function findIncomingEdgeCount(
  edges: WorkflowEdge[],
  nodeId: string
) {
  return edges.filter((edge) => edge.target === nodeId).length
}

export function findUnreachableNodeIds(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
) {
  const triggers = findTriggerNodes(nodes)
  if (triggers.length === 0) {
    return nodes.map((node) => node.id)
  }

  const visited = new Set<string>()
  const queue = triggers.map((node) => node.id)

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || visited.has(current)) {
      continue
    }

    visited.add(current)

    for (const edge of edges) {
      if (edge.source === current && !visited.has(edge.target)) {
        queue.push(edge.target)
      }
    }
  }

  return nodes
    .filter((node) => !visited.has(node.id))
    .map((node) => node.id)
}

export function getOutgoingEdges(
  map: Map<string, WorkflowEdge[]>,
  node: WorkflowNode,
  sourcePort?: string
) {
  const port = resolveOutputPortId(node, sourcePort)
  if (!port) {
    return []
  }

  const edges = map.get(`${node.id}:${port}`) ?? []
  if (edges.length > 0) {
    return edges
  }

  // Legacy edit-fields edges used output-1, output-2, … — treat as main-out.
  if (port === "main-out") {
    const legacy = map.get(`${node.id}:output-1`)
    if (legacy && legacy.length > 0) {
      return legacy
    }
  }

  const firstOutput = resolveOutputPortId(node)
  if (port === firstOutput && port !== "main-out") {
    return map.get(`${node.id}:main-out`) ?? []
  }

  return []
}
