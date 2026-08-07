"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"

import { DeleteWorkflowDialog } from "@/components/design/delete-workflow-dialog"
import { DeployWorkflowSheet } from "@/components/design/deploy-workflow-sheet"
import {
  DesignResourcesPanel,
} from "@/components/design/design-resources-panel"
import { EditorFloatingChrome } from "@/components/design/editor-floating-chrome"
import { EditorNodeInspectorPanel } from "@/components/design/editor-node-inspector-panel"
import { ValidationPanel } from "@/components/design/validation-panel"
import { WorkflowNodeGraph } from "@/components/design/workflow-node-graph"
import type {
  InspectorAnchorScreen,
  WorkflowGraphControls,
} from "@/components/design/workflow-node-graph"
import { useAssistant } from "@/components/ai/assistant-provider"
import { useRegisterWorkflowEditor } from "@/components/ai/workflow-editor-context"
import type { ConnectionDraft, PendingConnectionPlacement } from "@/lib/design/connection-draft"
import { useDesignHubState } from "@/hooks/use-design-hub-state"
import { useWorkflowValidation } from "@/hooks/use-workflow-validation"
import { useWorkflowAutoSave } from "@/hooks/use-workflow-auto-save"
import { workflowGraphSignature } from "@/lib/data/workflow-graph-signature"
import { getDeployDisabledReason } from "@/lib/design/deploy-disabled-reason"
import { deleteWorkflowAction } from "@/lib/actions/workflow-actions"
import { isPersistedWorkflowId } from "@/lib/data/workflow-mappers"
import {
  CANVAS_WORLD_HEIGHT,
  CANVAS_WORLD_WIDTH,
} from "@/lib/design/canvas-viewport"
import {
  CANVAS_DROP_ID,
  parseDesignPanelParam,
  RESOURCES_PANEL_DROP_ID,
  resourcesTabFromParam,
  type DesignPanelParam,
  type ResourcesPanelTab,
} from "@/lib/design/design-hub-types"
import {
  NODE_PALETTE,
  parsePaletteDragId,
  resolveCatalogItemFromDragId,
} from "@/lib/design/node-utils"
import { getComponentCatalogItemById } from "@/lib/design/component-catalog"
import type { WorkflowTemplate } from "@/lib/domain/template"
import type { Workflow } from "@/lib/domain/workflow"
import type { DataTableSummary } from "@/lib/domain/data-table"
import type { SecretSummary } from "@/lib/domain/secret"

const designHubCollisionDetection: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args)

  const resourcesHit = pointerHits.find(
    (collision) => collision.id === RESOURCES_PANEL_DROP_ID
  )
  if (resourcesHit) {
    return [resourcesHit]
  }

  const canvasHit = pointerHits.find(
    (collision) => collision.id === CANVAS_DROP_ID
  )
  if (canvasHit) {
    return [canvasHit]
  }

  return closestCenter(args)
}

export interface DesignHubViewProps {
  initialPanel?: DesignPanelParam
  workflow: Workflow
  templates: WorkflowTemplate[]
  dataTables?: DataTableSummary[]
  secrets?: SecretSummary[]
}

export function DesignHubView({
  initialPanel = "components",
  workflow: initialWorkflow,
  templates,
  dataTables = [],
  secrets = [],
}: DesignHubViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const panelParam = searchParams.get("panel")
  const { setOpen: setAssistantOpen } = useAssistant()

  const [resourcesOpen, setResourcesOpen] = React.useState(false)
  const [resourcesTab, setResourcesTab] = React.useState<ResourcesPanelTab>(
    initialPanel === "templates" ? "templates" : "components"
  )
  const [inspectorOpen, setInspectorOpen] = React.useState(false)
  const [inspectorAnchorScreen, setInspectorAnchorScreen] =
    React.useState<InspectorAnchorScreen | null>(null)
  const [activeDragLabel, setActiveDragLabel] = React.useState<string | null>(
    null
  )
  const [deployOpen, setDeployOpen] = React.useState(false)
  const [deployWorkflowId, setDeployWorkflowId] = React.useState<string | null>(
    null
  )
  const [deployMessage, setDeployMessage] = React.useState<string | null>(null)
  const [publishedGraphSignature, setPublishedGraphSignature] = React.useState(
    initialWorkflow.publishedGraphSignature ?? null
  )
  const [actionMessage, setActionMessage] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)
  const pointerRef = React.useRef({ x: 0, y: 0 })
  const getWorldPointRef = React.useRef(
    (_x: number, _y: number) => ({
      x: CANVAS_WORLD_WIDTH / 2,
      y: CANVAS_WORLD_HEIGHT / 2,
    })
  )
  const getViewportCenterRef = React.useRef(() => ({
    x: CANVAS_WORLD_WIDTH / 2,
    y: CANVAS_WORLD_HEIGHT / 2,
  }))
  const graphControlsRef = React.useRef<WorkflowGraphControls | null>(null)
  const [pendingConnectionPlacement, setPendingConnectionPlacement] =
    React.useState<PendingConnectionPlacement | null>(null)

  const handleRegisterViewport = React.useCallback(
    (api: {
      getWorldPoint: (x: number, y: number) => { x: number; y: number }
      getViewportCenter: () => { x: number; y: number }
    }) => {
      getWorldPointRef.current = api.getWorldPoint
      getViewportCenterRef.current = api.getViewportCenter
    },
    []
  )

  const handleRegisterGraphControls = React.useCallback(
    (controls: WorkflowGraphControls) => {
      graphControlsRef.current = controls
    },
    []
  )

  const handleInspectorAnchorChange = React.useCallback(
    (anchor: InspectorAnchorScreen | null) => {
      setInspectorAnchorScreen(anchor)
    },
    []
  )

  const getViewportAnchor = React.useCallback(
    () => getViewportCenterRef.current(),
    []
  )

  const {
    workflow,
    selectedNode,
    selectedNodeIds,
    selectedEdgeId,
    selectNode,
    selectNodes,
    selectEdge,
    connectNodes,
    placeConnectedNode,
    moveNodes,
    updateNodeLabel,
    updateNodeConfig,
    updateWorkflowName,
    removeSelectedNodes,
    deleteSelection,
    applyTemplate,
    applyGraph,
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
  } = useDesignHubState(initialWorkflow)

  const applyGraphToCanvas = React.useCallback(
    (graph: { nodes: typeof workflow.nodes; edges: NonNullable<typeof workflow.edges> }) => {
      applyGraph(graph)
    },
    [applyGraph]
  )

  useRegisterWorkflowEditor({
    workflow,
    selectedNodeId: selectedNode?.id ?? null,
    applyGraph: applyGraphToCanvas,
  })

  const handleWorkflowSaved = React.useCallback(
    (saved: Workflow) => {
      syncSavedWorkflow(saved)
    },
    [syncSavedWorkflow]
  )

  const { status: saveStatus, error: saveError, flushSave } =
    useWorkflowAutoSave(workflow, handleWorkflowSaved)

  const {
    status: validationStatus,
    logs: validationLogs,
    steps: validationSteps,
    nodeStates: validationNodeStates,
    activeEdgeId: validationActiveEdgeId,
    isDeployable,
    panelOpen: validationPanelOpen,
    setPanelOpen: setValidationPanelOpen,
    runValidation,
    submitApproval: submitValidationApproval,
    pendingApproval: validationPendingApproval,
    pendingWait: validationPendingWait,
    isRunning: isValidating,
  } = useWorkflowValidation(workflow)

  const hasUnpublishedChanges = React.useMemo(() => {
    if (!publishedGraphSignature) {
      return false
    }

    return workflowGraphSignature(workflow) !== publishedGraphSignature
  }, [publishedGraphSignature, workflow])

  const deployDisabledReason = React.useMemo(
    () => getDeployDisabledReason(isDeployable, validationStatus),
    [isDeployable, validationStatus]
  )

  React.useEffect(() => {
    setPublishedGraphSignature(initialWorkflow.publishedGraphSignature ?? null)
  }, [initialWorkflow.id, initialWorkflow.publishedGraphSignature])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  React.useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY }
    }

    window.addEventListener("pointermove", onPointerMove)
    return () => window.removeEventListener("pointermove", onPointerMove)
  }, [])

  React.useEffect(() => {
    if (panelParam === "ai") {
      setAssistantOpen(true)
      return
    }

    if (panelParam === "templates" || panelParam === "components") {
      setResourcesTab(resourcesTabFromParam(panelParam))
      setResourcesOpen(true)
    }
  }, [panelParam, setAssistantOpen])

  const syncPanelParam = React.useCallback(
    (panel: DesignPanelParam | null) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set("id", workflow.id)

      if (!panel || panel === "components") {
        params.delete("panel")
      } else {
        params.set("panel", panel)
      }

      const query = params.toString()
      router.replace(`/design/workflow-editor?${query}`, { scroll: false })
    },
    [router, searchParams, workflow.id]
  )

  const handleSelectNode = React.useCallback(
    (nodeId: string | null, options?: { additive?: boolean }) => {
      selectNode(nodeId, options)
      if (nodeId) {
        setInspectorOpen(true)
      } else {
        setInspectorOpen(false)
      }
    },
    [selectNode]
  )

  const handleSelectNodes = React.useCallback(
    (nodeIds: string[]) => {
      selectNodes(nodeIds)
      if (nodeIds.length > 0) {
        setInspectorOpen(true)
      } else {
        setInspectorOpen(false)
      }
    },
    [selectNodes]
  )

  const handleCloseInspector = React.useCallback(() => {
    setInspectorOpen(false)
  }, [])

  const handleResourcesTabChange = (tab: ResourcesPanelTab) => {
    setResourcesTab(tab)
    syncPanelParam(tab)
  }

  const handleResourcesOpenChange = (open: boolean) => {
    setResourcesOpen(open)
    if (!open) {
      syncPanelParam(null)
      if (pendingConnectionPlacement) {
        setPendingConnectionPlacement(null)
        graphControlsRef.current?.cancelConnectionDraft()
      }
    }
  }

  const handleOpenResources = () => {
    setResourcesOpen(true)
    syncPanelParam(resourcesTab)
  }

  const handleOpenAssistant = () => {
    setAssistantOpen(true)
  }

  const handleWorkflowNameChange = React.useCallback(
    (name: string) => {
      updateWorkflowName(name)
    },
    [updateWorkflowName]
  )

  const handleDeleteWorkflow = async () => {
    if (!isPersistedWorkflowId(workflow.id)) {
      return
    }

    setActionMessage(null)
    setIsDeleting(true)

    const { error } = await flushSave()
    if (error) {
      setIsDeleting(false)
      setActionMessage(error)
      return
    }

    const result = await deleteWorkflowAction(workflow.id)

    setIsDeleting(false)

    if ("error" in result) {
      setActionMessage(result.error)
      return
    }

    setDeleteConfirmOpen(false)
    router.push("/design/workflows")
  }

  const handleRequestDelete = () => {
    setDeleteConfirmOpen(true)
  }

  const handleApplyTemplate = React.useCallback(
    (template: WorkflowTemplate) => {
      applyTemplate(template, getViewportAnchor())
    },
    [applyTemplate, getViewportAnchor]
  )

  const onDragStart = (event: DragStartEvent) => {
    const catalogItemId = parsePaletteDragId(String(event.active.id))
    if (catalogItemId) {
      const item =
        getComponentCatalogItemById(catalogItemId) ??
        NODE_PALETTE.find((entry) => entry.id === catalogItemId)
      setActiveDragLabel(item?.label ?? catalogItemId)
      return
    }

    setActiveDragLabel("Template")
  }

  const handleDeployOpen = async () => {
    setDeployMessage(null)

    if (!isDeployable) {
      setDeployMessage(
        deployDisabledReason ??
          "Validate the workflow in the playground before deploying."
      )
      return
    }

    const { workflow: savedWorkflow, error } = await flushSave()

    if (error) {
      setDeployMessage(error)
      return
    }

    if (!isPersistedWorkflowId(savedWorkflow.id)) {
      setDeployMessage("Save the workflow draft before deploying.")
      return
    }

    setDeployWorkflowId(savedWorkflow.id)
    setDeployOpen(true)
  }

  const handleConnectionDraftCancel = React.useCallback(() => {
    setPendingConnectionPlacement(null)
  }, [])

  const handleConnectionDraftCanvasClick = React.useCallback(
    (
      world: { x: number; y: number },
      draft: ConnectionDraft
    ) => {
      const anchorNode = workflow.nodes.find((node) => node.id === draft.nodeId)
      if (!anchorNode) {
        graphControlsRef.current?.cancelConnectionDraft()
        return
      }

      setPendingConnectionPlacement({
        draft,
        worldPoint: world,
      })
      setResourcesTab("components")
      setResourcesOpen(true)
      syncPanelParam("components")
    },
    [syncPanelParam, workflow.nodes]
  )

  const handleConnectionComponentSelect = React.useCallback(
    (catalogItemId: string) => {
      if (!pendingConnectionPlacement) {
        return
      }

      const placed = placeConnectedNode(
        catalogItemId,
        pendingConnectionPlacement.worldPoint,
        pendingConnectionPlacement.draft
      )

      setPendingConnectionPlacement(null)
      graphControlsRef.current?.cancelConnectionDraft()
      setResourcesOpen(false)
      syncPanelParam(null)

      if (placed) {
        setInspectorOpen(true)
      }
    },
    [pendingConnectionPlacement, placeConnectedNode, syncPanelParam]
  )

  const connectionAnchorNode = React.useMemo(
    () =>
      pendingConnectionPlacement
        ? workflow.nodes.find(
            (node) => node.id === pendingConnectionPlacement.draft.nodeId
          ) ?? null
        : null,
    [pendingConnectionPlacement, workflow.nodes]
  )

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDragLabel(null)
    const activeId = String(event.active.id)
    const overId = event.over ? String(event.over.id) : null

    if (
      pendingConnectionPlacement &&
      overId === CANVAS_DROP_ID
    ) {
      const catalogItem = resolveCatalogItemFromDragId(activeId)
      if (catalogItem) {
        const placed = placeConnectedNode(
          catalogItem.id,
          pendingConnectionPlacement.worldPoint,
          pendingConnectionPlacement.draft
        )
        setPendingConnectionPlacement(null)
        graphControlsRef.current?.cancelConnectionDraft()
        setResourcesOpen(false)
        syncPanelParam(null)
        if (placed) {
          setInspectorOpen(true)
        }
        return
      }
    }

    const world = getWorldPointRef.current(
      pointerRef.current.x,
      pointerRef.current.y
    )
    handleDragEnd(activeId, overId, templates, world)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={designHubCollisionDetection}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="relative h-full min-h-0 overflow-hidden">
        <WorkflowNodeGraph
          fullBleed
          nodes={workflow.nodes}
          edges={workflow.edges}
          selectedNodeIds={selectedNodeIds}
          selectedEdgeId={selectedEdgeId}
          canPaste={canPaste}
          canUndo={canUndo}
          canRedo={canRedo}
          onSelectNode={handleSelectNode}
          onSelectNodes={handleSelectNodes}
          onSelectEdge={selectEdge}
          onConnectNodes={connectNodes}
          onMoveNodes={moveNodes}
          onCopy={copySelectedNodes}
          onPaste={pasteNodes}
          onDuplicate={duplicateSelectedNodes}
          onDelete={deleteSelection}
          onUndo={undo}
          onRedo={redo}
          onRegisterViewport={handleRegisterViewport}
          onRegisterGraphControls={handleRegisterGraphControls}
          onInspectorAnchorChange={handleInspectorAnchorChange}
          onConnectionDraftCanvasClick={handleConnectionDraftCanvasClick}
          onConnectionDraftCancel={handleConnectionDraftCancel}
          nodeExecutionStates={validationNodeStates}
          activeEdgeId={validationActiveEdgeId}
        />

        <EditorFloatingChrome
          workflowName={workflow.name}
          saveStatus={saveStatus}
          saveError={saveError}
          isDeleting={isDeleting}
          actionMessage={actionMessage}
          deployMessage={deployMessage}
          validationStatus={validationStatus}
          isDeployable={isDeployable}
          deployDisabledReason={deployDisabledReason}
          hasUnpublishedChanges={hasUnpublishedChanges}
          isValidating={isValidating}
          onNameChange={handleWorkflowNameChange}
          onOpenResources={handleOpenResources}
          onOpenAi={handleOpenAssistant}
          onDelete={handleRequestDelete}
          onValidate={runValidation}
          onDeploy={handleDeployOpen}
        />
        <EditorNodeInspectorPanel
          open={inspectorOpen}
          onClose={handleCloseInspector}
          workflow={workflow}
          node={selectedNode}
          selectedCount={selectedNodeIds.length}
          anchorScreen={inspectorAnchorScreen}
          dataTables={dataTables}
          secrets={secrets}
          validationSteps={validationSteps}
          onLabelChange={(label) => {
            if (selectedNode) {
              updateNodeLabel(selectedNode.id, label)
            }
          }}
          onConfigChange={(key, value) => {
            if (selectedNode) {
              updateNodeConfig(selectedNode.id, key, value)
            }
          }}
          onRemove={removeSelectedNodes}
        />
      </div>

      <DesignResourcesPanel
        open={resourcesOpen}
        onOpenChange={handleResourcesOpenChange}
        activeTab={resourcesTab}
        onTabChange={handleResourcesTabChange}
        templates={templates}
        onApplyTemplate={handleApplyTemplate}
        connectionDraft={pendingConnectionPlacement?.draft ?? null}
        connectionAnchorNode={connectionAnchorNode}
        onSelectComponent={
          pendingConnectionPlacement ? handleConnectionComponentSelect : undefined
        }
      />

      <DeleteWorkflowDialog
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setDeleteConfirmOpen(false)
          }
        }}
        workflowName={workflow.name}
        isDeleting={isDeleting}
        onConfirm={handleDeleteWorkflow}
      />

      <DeployWorkflowSheet
        open={deployOpen}
        onOpenChange={setDeployOpen}
        workflowId={deployWorkflowId}
        onDeployed={() => {
          setPublishedGraphSignature(workflowGraphSignature(workflow))
          setDeployMessage("Workflow is live in production.")
        }}
      />

      <ValidationPanel
        open={validationPanelOpen}
        onOpenChange={setValidationPanelOpen}
        status={validationStatus}
        logs={validationLogs}
        steps={validationSteps}
        isRunning={isValidating}
        pendingApproval={validationPendingApproval}
        pendingWait={validationPendingWait}
        onRunValidation={runValidation}
        onSubmitApproval={submitValidationApproval}
      />

      <DragOverlay dropAnimation={null}>
        {activeDragLabel ? (
          <div className="rounded-none border bg-background px-3 py-2 text-sm shadow-md">
            {activeDragLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
