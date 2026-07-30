"use client"

import * as React from "react"

import {
  CANVAS_NODE_HEIGHT,
  CANVAS_NODE_WIDTH,
} from "@/lib/design/canvas-viewport"
import {
  clampNodePosition,
  ensureNodePositions,
} from "@/lib/design/layout-utils"
import {
  cloneWorkflowGraph,
  generateAiWorkflowGraph,
  layoutWorkflowGraph,
  offsetWorkflowGraphToAnchor,
  removeEdgesForNodes,
  sanitizeManualEdge,
} from "@/lib/design/workflow-graph"
import {
  cloneWorkflowSnapshot,
  WORKFLOW_HISTORY_LIMIT,
  type WorkflowGraphSnapshot,
} from "@/lib/design/workflow-history"
import {
  createNodeFromKind,
  createNodeId,
  parsePaletteDragId,
  parseTemplateDragId,
} from "@/lib/design/node-utils"
import type { WorkflowTemplate } from "@/lib/domain/template"
import type { ResourcesPanelTab } from "@/lib/design/design-hub-types"
import type { Workflow, WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"

export type { ResourcesPanelTab } from "@/lib/design/design-hub-types"

const PASTE_OFFSET = 40

function cloneNodesWithOffset(nodes: WorkflowNode[], offset = PASTE_OFFSET) {
  return nodes.map((node) => ({
    ...node,
    id: createNodeId(),
    config: { ...node.config },
    position: node.position
      ? {
          x: node.position.x + offset,
          y: node.position.y + offset,
        }
      : undefined,
  }))
}

export function useDesignHubState(initialWorkflow: Workflow) {
  const [workflow, setWorkflow] = React.useState(() => ({
    ...initialWorkflow,
    nodes: ensureNodePositions(initialWorkflow.nodes),
    edges: initialWorkflow.edges ?? [],
  }))
  const [selectedNodeIds, setSelectedNodeIds] = React.useState<string[]>([])
  const [selectedEdgeId, setSelectedEdgeId] = React.useState<string | null>(
    null
  )
  const [canUndo, setCanUndo] = React.useState(false)
  const [canRedo, setCanRedo] = React.useState(false)
  const clipboardRef = React.useRef<WorkflowNode[]>([])
  const [canPaste, setCanPaste] = React.useState(false)

  const workflowRef = React.useRef(workflow)
  workflowRef.current = workflow

  const pastRef = React.useRef<WorkflowGraphSnapshot[]>([])
  const futureRef = React.useRef<WorkflowGraphSnapshot[]>([])

  const syncHistoryFlags = React.useCallback(() => {
    setCanUndo(pastRef.current.length > 0)
    setCanRedo(futureRef.current.length > 0)
  }, [])

  const recordHistory = React.useCallback(() => {
    const { nodes, edges } = workflowRef.current
    pastRef.current.push(cloneWorkflowSnapshot(nodes, edges))

    if (pastRef.current.length > WORKFLOW_HISTORY_LIMIT) {
      pastRef.current.shift()
    }

    futureRef.current = []
    syncHistoryFlags()
  }, [syncHistoryFlags])

  const applySnapshot = React.useCallback((snapshot: WorkflowGraphSnapshot) => {
    setWorkflow((current) => ({
      ...current,
      nodes: ensureNodePositions(snapshot.nodes),
      edges: snapshot.edges,
      updatedAt: new Date().toISOString(),
    }))
    setSelectedNodeIds([])
    setSelectedEdgeId(null)
  }, [])

  const undo = React.useCallback(() => {
    const past = pastRef.current
    if (past.length === 0) {
      return
    }

    futureRef.current.unshift(
      cloneWorkflowSnapshot(
        workflowRef.current.nodes,
        workflowRef.current.edges
      )
    )

    const previous = past.pop()
    if (previous) {
      applySnapshot(previous)
    }

    syncHistoryFlags()
  }, [applySnapshot, syncHistoryFlags])

  const redo = React.useCallback(() => {
    const future = futureRef.current
    if (future.length === 0) {
      return
    }

    pastRef.current.push(
      cloneWorkflowSnapshot(
        workflowRef.current.nodes,
        workflowRef.current.edges
      )
    )

    const next = future.shift()
    if (next) {
      applySnapshot(next)
    }

    syncHistoryFlags()
  }, [applySnapshot, syncHistoryFlags])

  const selectedNode =
    workflow.nodes.find((node) => node.id === selectedNodeIds[0]) ?? null

  const selectNode = React.useCallback(
    (nodeId: string | null, options?: { additive?: boolean }) => {
      setSelectedEdgeId(null)

      if (!nodeId) {
        setSelectedNodeIds([])
        return
      }

      if (options?.additive) {
        setSelectedNodeIds((current) =>
          current.includes(nodeId)
            ? current.filter((id) => id !== nodeId)
            : [...current, nodeId]
        )
        return
      }

      setSelectedNodeIds((current) => {
        if (current.includes(nodeId)) {
          return current
        }
        return [nodeId]
      })
    },
    []
  )

  const selectNodes = React.useCallback((nodeIds: string[]) => {
    setSelectedEdgeId(null)
    setSelectedNodeIds(nodeIds)
  }, [])

  const selectEdge = React.useCallback((edgeId: string) => {
    setSelectedNodeIds([])
    setSelectedEdgeId(edgeId)
  }, [])

  const applyGraph = React.useCallback(
    (graph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }, name?: string) => {
      recordHistory()
      setWorkflow((current) => ({
        ...current,
        name: name ?? current.name,
        nodes: ensureNodePositions(graph.nodes),
        edges: graph.edges,
        updatedAt: new Date().toISOString(),
      }))
      setSelectedNodeIds([])
      setSelectedEdgeId(null)
    },
    [recordHistory]
  )

  const addNodeAtPosition = React.useCallback(
    (node: WorkflowNode, options?: { select?: boolean }) => {
      recordHistory()
      setWorkflow((current) => ({
        ...current,
        nodes: [...current.nodes, node],
        updatedAt: new Date().toISOString(),
      }))

      setSelectedEdgeId(null)

      if (options?.select !== false) {
        setSelectedNodeIds([node.id])
      }
    },
    [recordHistory]
  )

  const connectNodes = React.useCallback(
    (source: string, target: string) => {
      const edge = sanitizeManualEdge(workflowRef.current.edges, source, target)
      if (!edge) {
        return
      }

      recordHistory()
      setWorkflow((current) => ({
        ...current,
        edges: [...current.edges, edge],
        updatedAt: new Date().toISOString(),
      }))
    },
    [recordHistory]
  )

  const moveNodes = React.useCallback(
    (nodeIds: string[], deltaX: number, deltaY: number) => {
      if (deltaX === 0 && deltaY === 0) {
        return
      }

      recordHistory()
      const idSet = new Set(nodeIds)
      setWorkflow((current) => ({
        ...current,
        nodes: current.nodes.map((node) => {
          if (!idSet.has(node.id) || !node.position) {
            return node
          }

          const next = clampNodePosition(
            node.position.x + deltaX,
            node.position.y + deltaY
          )
          return { ...node, position: next }
        }),
        updatedAt: new Date().toISOString(),
      }))
    },
    [recordHistory]
  )

  const updateNodeLabel = React.useCallback((nodeId: string, label: string) => {
    setWorkflow((current) => ({
      ...current,
      nodes: current.nodes.map((node) =>
        node.id === nodeId ? { ...node, label } : node
      ),
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const updateWorkflowName = React.useCallback((name: string) => {
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }

    setWorkflow((current) => ({
      ...current,
      name: trimmed,
      updatedAt: new Date().toISOString(),
    }))
  }, [])

  const removeSelectedNodes = React.useCallback(() => {
    if (selectedNodeIds.length === 0) {
      return
    }

    recordHistory()
    setWorkflow((current) => {
      const idSet = new Set(selectedNodeIds)
      return {
        ...current,
        nodes: current.nodes.filter((node) => !idSet.has(node.id)),
        edges: removeEdgesForNodes(current.edges, idSet),
        updatedAt: new Date().toISOString(),
      }
    })
    setSelectedNodeIds([])
    setSelectedEdgeId(null)
  }, [recordHistory, selectedNodeIds])

  const removeSelectedEdge = React.useCallback(() => {
    if (!selectedEdgeId) {
      return
    }

    recordHistory()
    setWorkflow((current) => ({
      ...current,
      edges: current.edges.filter((edge) => edge.id !== selectedEdgeId),
      updatedAt: new Date().toISOString(),
    }))
    setSelectedEdgeId(null)
  }, [recordHistory, selectedEdgeId])

  const deleteSelection = React.useCallback(() => {
    if (selectedEdgeId) {
      removeSelectedEdge()
      return
    }

    removeSelectedNodes()
  }, [removeSelectedEdge, removeSelectedNodes, selectedEdgeId])

  const applyTemplate = React.useCallback(
    (template: WorkflowTemplate, anchor: { x: number; y: number }) => {
      const graph = cloneWorkflowGraph(template.nodes, template.edges)
      const positioned = offsetWorkflowGraphToAnchor(graph, anchor)
      applyGraph(positioned, template.name)
    },
    [applyGraph]
  )

  const generateFromAi = React.useCallback(
    (request: string, anchor: { x: number; y: number }) => {
      const graph = generateAiWorkflowGraph(request)
      const positioned = offsetWorkflowGraphToAnchor(
        layoutWorkflowGraph(graph),
        anchor
      )
      applyGraph(
        positioned,
        request.trim().slice(0, 64) || "AI-generated workflow"
      )
    },
    [applyGraph]
  )

  const copySelectedNodes = React.useCallback(() => {
    const selected = workflow.nodes.filter((node) =>
      selectedNodeIds.includes(node.id)
    )
    clipboardRef.current = selected.map((node) => ({
      ...node,
      config: { ...node.config },
      position: node.position ? { ...node.position } : undefined,
    }))
    setCanPaste(selected.length > 0)
  }, [selectedNodeIds, workflow.nodes])

  const pasteNodes = React.useCallback(() => {
    if (clipboardRef.current.length === 0) {
      return
    }

    recordHistory()
    const pasted = cloneNodesWithOffset(clipboardRef.current)
    setWorkflow((current) => ({
      ...current,
      nodes: [...current.nodes, ...pasted],
      updatedAt: new Date().toISOString(),
    }))
    setSelectedEdgeId(null)
    setSelectedNodeIds(pasted.map((node) => node.id))
    clipboardRef.current = pasted.map((node) => ({
      ...node,
      config: { ...node.config },
      position: node.position ? { ...node.position } : undefined,
    }))
  }, [recordHistory])

  const duplicateSelectedNodes = React.useCallback(() => {
    const selected = workflow.nodes.filter((node) =>
      selectedNodeIds.includes(node.id)
    )
    if (selected.length === 0) {
      return
    }

    recordHistory()
    const duplicated = cloneNodesWithOffset(selected)
    setWorkflow((current) => ({
      ...current,
      nodes: [...current.nodes, ...duplicated],
      updatedAt: new Date().toISOString(),
    }))
    setSelectedEdgeId(null)
    setSelectedNodeIds(duplicated.map((node) => node.id))
  }, [recordHistory, selectedNodeIds, workflow.nodes])

  const syncSavedWorkflow = React.useCallback((saved: Workflow) => {
    setWorkflow((current) => ({
      ...current,
      id: saved.id,
      status: saved.status,
      updatedAt: saved.updatedAt,
    }))
  }, [])

  const handleDragEnd = React.useCallback(
    (
      activeId: string,
      overId: string | null,
      templates: WorkflowTemplate[],
      dropPosition?: { x: number; y: number }
    ) => {
      if (!overId) {
        return
      }

      const paletteKind = parsePaletteDragId(activeId)
      if (paletteKind) {
        const newNode = createNodeFromKind(paletteKind)
        const position = clampNodePosition(
          (dropPosition?.x ?? 0) - CANVAS_NODE_WIDTH / 2,
          (dropPosition?.y ?? 0) - CANVAS_NODE_HEIGHT / 2
        )
        addNodeAtPosition({ ...newNode, position }, { select: false })
        return
      }

      const templateId = parseTemplateDragId(activeId)
      if (templateId) {
        const template = templates.find((item) => item.id === templateId)
        if (template && dropPosition) {
          applyTemplate(template, dropPosition)
        }
      }
    },
    [addNodeAtPosition, applyTemplate]
  )

  return {
    workflow,
    selectedNode,
    selectedNodeIds,
    selectedEdgeId,
    selectNode,
    selectNodes,
    selectEdge,
    connectNodes,
    moveNodes,
    updateNodeLabel,
    updateWorkflowName,
    removeSelectedNodes,
    removeSelectedEdge,
    deleteSelection,
    applyTemplate,
    generateFromAi,
    handleDragEnd,
    copySelectedNodes,
    pasteNodes,
    duplicateSelectedNodes,
    canPaste,
    canUndo,
    canRedo,
    undo,
    redo,
    syncSavedWorkflow,
  }
}
