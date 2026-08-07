import type { Workflow, WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import { clampNodePositionToWorld } from "@/lib/design/canvas-viewport"
import {
  resolveInputPortId,
  resolveOutputPortId,
} from "@/lib/design/node-layout"
import {
  ensureNodePositions,
  getNodeDimensions,
  layoutNodesHorizontally,
} from "@/lib/design/layout-utils"
import { createNodeId } from "@/lib/design/node-utils"

/**
 * Portable workflow graph for manual editing, templates, and AI generation.
 * AI builders should produce both `nodes` and `edges` explicitly.
 */
export type WorkflowGraphDraft = {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

export function createEdgeId() {
  return `edge-${crypto.randomUUID()}`
}

export function createEdge(
  source: string,
  target: string,
  options?: {
    label?: string
    sourcePort?: string
    targetPort?: string
  }
): WorkflowEdge {
  return {
    id: createEdgeId(),
    source,
    target,
    label: options?.label,
    sourcePort: options?.sourcePort,
    targetPort: options?.targetPort,
  }
}

/** Connect each node to the next in array order (for templates only). */
export function buildSequentialEdges(nodes: WorkflowNode[]): WorkflowEdge[] {
  return nodes.slice(0, -1).map((node, index) =>
    createEdge(node.id, nodes[index + 1].id)
  )
}

export function cloneWorkflowGraph(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): WorkflowGraphDraft {
  const idMap = new Map<string, string>()

  const clonedNodes = nodes.map((node) => {
    const newId = createNodeId()
    idMap.set(node.id, newId)
    return {
      ...node,
      id: newId,
      config: remapUpstreamRefsInConfig(node.config, idMap),
      position: node.position ? { ...node.position } : undefined,
    }
  })

  const clonedEdges = edges.map((edge) => ({
    id: createEdgeId(),
    source: idMap.get(edge.source) ?? edge.source,
    target: idMap.get(edge.target) ?? edge.target,
    label: edge.label,
    sourcePort: edge.sourcePort,
    targetPort: edge.targetPort,
  }))

  return { nodes: clonedNodes, edges: clonedEdges }
}

function remapUpstreamRefsInValue(
  value: unknown,
  idMap: Map<string, string>
): unknown {
  if (typeof value === "string") {
    const dotIndex = value.indexOf(".")
    if (dotIndex === -1) {
      return value
    }

    const nodeId = value.slice(0, dotIndex)
    const mappedId = idMap.get(nodeId)
    if (!mappedId) {
      return value
    }

    return `${mappedId}${value.slice(dotIndex)}`
  }

  if (Array.isArray(value)) {
    return value.map((entry) => remapUpstreamRefsInValue(entry, idMap))
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        remapUpstreamRefsInValue(entry, idMap),
      ])
    )
  }

  return value
}

function remapUpstreamRefsInConfig(
  config: WorkflowNode["config"],
  idMap: Map<string, string>
) {
  return remapUpstreamRefsInValue({ ...config }, idMap) as WorkflowNode["config"]
}

export function layoutWorkflowGraph(
  graph: WorkflowGraphDraft,
  layoutNodes = true
): WorkflowGraphDraft {
  return {
    nodes: layoutNodes ? layoutNodesHorizontally(graph.nodes) : graph.nodes,
    edges: graph.edges,
  }
}

export function offsetWorkflowGraphToAnchor(
  graph: WorkflowGraphDraft,
  anchor: { x: number; y: number },
  layoutNodes = true
): WorkflowGraphDraft {
  const laidOut = layoutWorkflowGraph(graph, layoutNodes)
  const positioned = ensureNodePositions(laidOut.nodes)

  if (positioned.length === 0) {
    return laidOut
  }

  const minX = Math.min(...positioned.map((node) => node.position?.x ?? 0))
  const minY = Math.min(...positioned.map((node) => node.position?.y ?? 0))
  const maxX = Math.max(
    ...positioned.map((node) => {
      const { width } = getNodeDimensions(node)
      return (node.position?.x ?? 0) + width
    })
  )
  const maxY = Math.max(
    ...positioned.map((node) => {
      const { height } = getNodeDimensions(node)
      return (node.position?.y ?? 0) + height
    })
  )

  const centerX = (minX + maxX) / 2
  const centerY = (minY + maxY) / 2
  const offsetX = anchor.x - centerX
  const offsetY = anchor.y - centerY

  return {
    nodes: positioned.map((node) => {
      const x = (node.position?.x ?? 0) + offsetX
      const y = (node.position?.y ?? 0) + offsetY

      return {
        ...node,
        position: clampNodePositionToWorld(x, y, node),
      }
    }),
    edges: laidOut.edges,
  }
}

export function applyWorkflowGraph(
  workflow: Workflow,
  graph: WorkflowGraphDraft,
  options?: { name?: string; layout?: boolean }
): Workflow {
  const laidOut = layoutWorkflowGraph(graph, options?.layout ?? true)

  return {
    ...workflow,
    name: options?.name ?? workflow.name,
    nodes: laidOut.nodes,
    edges: laidOut.edges,
    updatedAt: new Date().toISOString(),
  }
}

export function removeEdgesForNodes(
  edges: WorkflowEdge[],
  nodeIds: Set<string>
): WorkflowEdge[] {
  return edges.filter(
    (edge) => !nodeIds.has(edge.source) && !nodeIds.has(edge.target)
  )
}

export function edgeExists(
  edges: WorkflowEdge[],
  source: string,
  target: string,
  sourcePort?: string,
  targetPort?: string
) {
  return edges.some(
    (edge) =>
      edge.source === source &&
      edge.target === target &&
      edge.sourcePort === sourcePort &&
      edge.targetPort === targetPort
  )
}

export function sanitizeManualEdge(
  edges: WorkflowEdge[],
  sourceNode: WorkflowNode,
  targetNode: WorkflowNode,
  sourcePort?: string,
  targetPort?: string
): WorkflowEdge | null {
  if (sourceNode.id === targetNode.id) {
    return null
  }

  const resolvedSourcePort = resolveOutputPortId(sourceNode, sourcePort)
  const resolvedTargetPort = resolveInputPortId(targetNode, targetPort)

  if (
    edgeExists(
      edges,
      sourceNode.id,
      targetNode.id,
      resolvedSourcePort,
      resolvedTargetPort
    )
  ) {
    return null
  }

  return createEdge(sourceNode.id, targetNode.id, {
    sourcePort: resolvedSourcePort,
    targetPort: resolvedTargetPort,
  })
}
