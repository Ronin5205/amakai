import { cloneJsonValue, ensureJsonObject } from "@/lib/design/json-value"
import { parseOutputFieldDefs } from "@/lib/design/output-fields"
import {
  appendApprovalMetadata,
  describeApprovalTarget,
  getApprovalApproverType,
  validateApprovalConfig,
} from "@/lib/design/approval-config"
import { validateFieldEditRows } from "@/lib/design/edit-fields"
import {
  evaluateComparisonRule,
  formatComparisonSummary,
} from "@/lib/design/comparison-rules"
import {
  isSwitchDefaultCase,
  validateSwitchCaseRules,
} from "@/lib/design/switch-rules"
import {
  formatWaitDuration,
  getWaitDurationMs,
} from "@/lib/design/wait-config"
import { resolveInputPortId, resolveOutputPortId } from "@/lib/design/node-layout"
import {
  getCatalogItemId,
  resolveNodeDefinition,
} from "@/lib/design/resolve-node-definition"
import {
  buildOutgoingEdgeMap,
  findTriggerNodes,
  findUnreachableNodeIds,
  getOutgoingEdges,
} from "@/lib/engine/graph-index"
import type {
  ApprovalDecision,
  PlaygroundLogEntry,
  PlaygroundQueueItem,
  PlaygroundResumeAction,
  PlaygroundRunOptions,
  PlaygroundRunResult,
  PlaygroundStep,
  PlaygroundContinuationState,
} from "@/lib/engine/types"
import {
  asRenameRows,
  asStringArray,
  asTableColumnMapRows,
} from "@/lib/design/upstream-fields"
import {
  playgroundDataTableReadAction,
  playgroundDataTableWriteAction,
} from "@/lib/actions/playground-data-table-actions"
import {
  applyFieldEditsToPayload,
  applySingleFieldEdit,
  applyRenamesToPayload,
  buildDataTableRowFromPayload,
  buildTriggerPlaygroundPayload,
  buildTriggerPayloadFromValues,
  countPopulatedRowFields,
  filterDataTableRowsByColumn,
  getDataTableOperation,
  getDataTableWriteMode,
  isDataTableFindEnabled,
  mergePayload,
  resolveFindCompareValue,
  resolvePayloadField,
} from "@/lib/engine/playground-data-table"
import { resolveCollectionFromField } from "@/lib/engine/loop-collection"
import {
  createMergeBuffer,
  handleMergeNodeArrival,
  hasMergeInputConnected,
} from "@/lib/engine/merge-buffer"
import {
  beginLoopFanOut,
  createLoopCompletionBuffer,
  settleLoopWorkUnit,
  type LoopCompletionBuffer,
  type LoopWorkContext,
} from "@/lib/engine/loop-completion"
import {
  getMergeInputCount,
} from "@/lib/design/component-variant-definitions"
import {
  aggregateItemsByField,
} from "@/lib/engine/payload-transforms"
import type { WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0
}

function validateComparisonRule(node: WorkflowNode, label: string) {
  if (!isNonEmptyString(node.config.field)) {
    return { ok: false as const, message: `${label} is missing a field from the previous node` }
  }
  if (!isNonEmptyString(node.config.compareValue)) {
    return { ok: false as const, message: `${label} is missing a comparison value` }
  }
  return { ok: true as const }
}

function resolveSwitchOutputPort(node: WorkflowNode, payload: unknown) {
  const validation = validateSwitchCaseRules(node)
  if (!validation.ok) {
    return validation
  }

  const includeDefault = node.config.includeDefaultOutput === true
  const matched = validation.rules.find(
    (rule) =>
      !isSwitchDefaultCase(rule) &&
      evaluateComparisonRule(
        payload,
        rule.field,
        rule.operator,
        rule.compareValue
      )
  )

  if (matched) {
    return {
      ok: true as const,
      portId: matched.portId,
      message: `Switch matched ${matched.label} (${formatComparisonSummary(
        matched.field,
        matched.operator,
        matched.compareValue
      )})`,
    }
  }

  const defaultRule = validation.rules.find(isSwitchDefaultCase)
  if (includeDefault && defaultRule) {
    return {
      ok: true as const,
      portId: defaultRule.portId,
      message: "Switch routed to Fallback (no case matched)",
    }
  }

  return {
    ok: false as const,
    message: "Switch did not match any case and no fallback output is configured",
  }
}

function formatMergeWaitingMessage(
  node: WorkflowNode,
  port: string,
  received: number,
  expected: number
) {
  return `Input ${port.replace("input-", "")} arrived (${received}/${expected}) — waiting for remaining inputs on "${node.label}"`
}

function serializeLoopCompletions(buffer: LoopCompletionBuffer) {
  return Object.fromEntries(buffer.entries())
}

function restoreLoopCompletions(
  serialized?: Record<
    string,
    { remaining: number; totalItems: number; donePayload: unknown }
  >
) {
  const buffer = createLoopCompletionBuffer()
  if (!serialized) {
    return buffer
  }
  for (const [key, value] of Object.entries(serialized)) {
    buffer.set(key, { ...value })
  }
  return buffer
}

function enqueueDoneEdges(
  queue: PlaygroundQueueItem[],
  outgoing: ReturnType<typeof buildOutgoingEdgeMap>,
  loopNode: WorkflowNode,
  donePayload: unknown
) {
  const doneEdges = getOutgoingEdges(outgoing, loopNode, "done")
  for (const edge of doneEdges) {
    queue.push({
      nodeId: edge.target,
      payload: donePayload,
      viaEdgeId: edge.id,
    })
  }
}

function fanOutLoopItems(
  queue: PlaygroundQueueItem[],
  loopBuffers: LoopCompletionBuffer,
  outgoing: ReturnType<typeof buildOutgoingEdgeMap>,
  loopNode: WorkflowNode,
  result: {
    payload: unknown
    loopItems: unknown[]
  }
) {
  const loopEdges = getOutgoingEdges(outgoing, loopNode, "loop")
  const donePayload = mergePayload(result.payload, {
    loopCompleted: true,
    loopItemCount: result.loopItems.length,
  })

  if (loopEdges.length === 0 || result.loopItems.length === 0) {
    enqueueDoneEdges(queue, outgoing, loopNode, donePayload)
    return
  }

  const workUnits = result.loopItems.length * loopEdges.length
  beginLoopFanOut(
    loopBuffers,
    loopNode.id,
    workUnits,
    result.loopItems.length,
    donePayload
  )

  const loopContext: LoopWorkContext = { loopNodeId: loopNode.id }

  for (let index = 0; index < result.loopItems.length; index += 1) {
    const itemPayload = mergePayload(result.payload, {
      item: result.loopItems[index],
      loopItem: result.loopItems[index],
      loopIndex: index,
      loopTotal: result.loopItems.length,
    })

    for (const edge of loopEdges) {
      queue.push({
        nodeId: edge.target,
        payload: itemPayload,
        viaEdgeId: edge.id,
        loopContext,
      })
    }
  }
}

function enqueueChildrenWithLoopContext(
  queue: PlaygroundQueueItem[],
  loopBuffers: LoopCompletionBuffer,
  outgoing: ReturnType<typeof buildOutgoingEdgeMap>,
  loopNodeById: Map<string, WorkflowNode>,
  edges: Array<{ nodeId: string; payload: unknown; viaEdgeId: string }>,
  parentLoopContext?: LoopWorkContext
) {
  for (const entry of edges) {
    queue.push({
      ...entry,
      loopContext: parentLoopContext,
    })
  }

  if (!parentLoopContext) {
    return
  }

  const settled = settleLoopWorkUnit(
    loopBuffers,
    parentLoopContext.loopNodeId,
    edges.length
  )

  if (settled.completed && settled.tracker) {
    const loopNode = loopNodeById.get(parentLoopContext.loopNodeId)
    if (loopNode) {
      enqueueDoneEdges(
        queue,
        outgoing,
        loopNode,
        settled.tracker.donePayload
      )
    }
  }
}

const MAX_PLAYGROUND_STEPS = 200

let logCounter = 0

function createLog(
  message: string,
  level: PlaygroundLogEntry["level"],
  node?: WorkflowNode
): PlaygroundLogEntry {
  logCounter += 1
  return {
    id: `log-${logCounter}`,
    timestamp: Date.now(),
    nodeId: node?.id,
    nodeLabel: node?.label,
    message,
    level,
  }
}

function createStep(
  type: PlaygroundStep["type"],
  log: PlaygroundLogEntry,
  extras?: Pick<
    PlaygroundStep,
    "nodeId" | "edgeId" | "inputPayload" | "outputPayload"
  >
): PlaygroundStep {
  return {
    type,
    log,
    nodeId: extras?.nodeId ?? log.nodeId,
    edgeId: extras?.edgeId,
    inputPayload: extras?.inputPayload,
    outputPayload: extras?.outputPayload,
  }
}

function clonePayload(payload: unknown): unknown {
  return cloneJsonValue(payload)
}

type NodeProcessResult =
  | {
      ok: true
      outputPort?: string
      payload: unknown
      message: string
      terminal?: boolean
      loopItems?: unknown[]
      fanOutOutputs?: Array<{ portId: string; payload: unknown }>
      /** Filter dropped this payload — runner must not enqueue downstream edges. */
      filteredOut?: boolean
    }
  | { ok: false; message: string; pendingApproval?: boolean; pendingWait?: boolean; payload?: unknown; durationMs?: number }

function hasIncomingEdgeOnPort(
  edges: WorkflowEdge[],
  node: WorkflowNode,
  portId: string
) {
  return edges.some((edge) => {
    if (edge.target !== node.id) {
      return false
    }

    const targetPort = resolveInputPortId(node, edge.targetPort)
    return targetPort === portId
  })
}

function passThrough(
  node: WorkflowNode,
  payload: unknown,
  message: string,
  outputPort?: string
): NodeProcessResult {
  return {
    ok: true,
    outputPort: outputPort ?? resolveOutputPortId(node) ?? "main-out",
    payload,
    message,
  }
}

async function processDataTableNode(
  node: WorkflowNode,
  payload: unknown
): Promise<NodeProcessResult> {
  const tableName = String(node.config.tableName ?? "")
  if (!isNonEmptyString(tableName)) {
    return { ok: false, message: "Data Table is missing a selected table" }
  }

  const operation = getDataTableOperation(node)

  if (operation === "write") {
    const mappings = asTableColumnMapRows(node.config.columnMappings)
    if (
      mappings.length === 0 ||
      !mappings.some((row) => isNonEmptyString(row.sourceField))
    ) {
      return {
        ok: false,
        message:
          "Data Table write requires at least one column mapped from the previous node",
      }
    }

    const writeMode = getDataTableWriteMode(node)
    const matchColumn = String(node.config.matchColumn ?? "").trim()
    const matchValueField = String(node.config.matchValueField ?? "").trim()

    if (writeMode === "upsert") {
      if (!matchColumn) {
        return {
          ok: false,
          message: "Data Table upsert requires a match column",
        }
      }
      if (!matchValueField) {
        return {
          ok: false,
          message:
            "Data Table upsert requires a match value field from the previous node",
        }
      }
    }

    const rowData = buildDataTableRowFromPayload(payload, mappings)
    if (countPopulatedRowFields(rowData) === 0) {
      return {
        ok: false,
        message:
          "Data Table write could not resolve any values from the previous node. Check column mappings and upstream output fields.",
      }
    }

    const matchValue =
      writeMode === "upsert"
        ? resolvePayloadField(payload, matchValueField)
        : undefined

    if (writeMode === "upsert" && matchValue === undefined) {
      return {
        ok: false,
        message:
          "Data Table upsert could not resolve the match value from the previous node.",
      }
    }

    const result = await playgroundDataTableWriteAction(tableName, rowData, {
      writeMode,
      matchColumn,
      matchValue,
    })

    if ("error" in result) {
      return { ok: false, message: result.error }
    }

    const actionLabel = result.updated ? "Updated" : "Wrote"

    return passThrough(
      node,
      mergePayload(payload, {
        dataTableName: result.tableName,
        dataTableOperation: "write",
        dataTableWriteMode: writeMode,
        dataTableRowUpdated: result.updated === true,
        dataTableRow: result.row.data,
      }),
      `${actionLabel} 1 row (${countPopulatedRowFields(rowData)} field(s)) to "${result.tableName}" (playground)`
    )
  }

  const result = await playgroundDataTableReadAction(tableName)

  if ("error" in result) {
    return { ok: false, message: result.error }
  }

  let matchedRows = result.rows

  if (isDataTableFindEnabled(node)) {
    const findColumn = String(node.config.findColumn ?? "").trim()
    if (!findColumn) {
      return {
        ok: false,
        message: "Data Table find requires a find column",
      }
    }

    const compareValue = resolveFindCompareValue(
      payload,
      node.config.findValue,
      node.config.findValueField
    )

    if (compareValue === undefined) {
      return {
        ok: false,
        message:
          "Data Table find requires a find value or an upstream find value field",
      }
    }

    matchedRows = filterDataTableRowsByColumn(
      result.rows,
      findColumn,
      node.config.findOperator,
      compareValue
    )
  }

  const rows = matchedRows.map((row) => row.data)
  const payloadPatch: Record<string, unknown> = {
    dataTableName: result.tableName,
    dataTableOperation: "read",
    dataTableRows: rows,
    dataTableRowCount: rows.length,
  }

  if (isDataTableFindEnabled(node)) {
    payloadPatch.dataTableFindEnabled = true
    if (rows.length === 1) {
      payloadPatch.dataTableRow = rows[0]
    }
  }

  const findLabel = isDataTableFindEnabled(node)
    ? `Found ${rows.length} matching row(s)`
    : `Read ${rows.length} row(s)`

  return passThrough(
    node,
    mergePayload(payload, payloadPatch),
    `${findLabel} from "${result.tableName}" (playground)`
  )
}

async function processNodeInPlayground(
  node: WorkflowNode,
  payload: unknown,
  options?: PlaygroundRunOptions
): Promise<NodeProcessResult> {
  const catalogItemId = getCatalogItemId(node)

  if (catalogItemId === "exception.stop-and-error") {
    return {
      ok: true,
      outputPort: "",
      payload,
      terminal: true,
      message: String(
        node.config.errorMessage ?? "Workflow stopped (Stop and Error)"
      ),
    }
  }

  switch (node.kind) {
    case "trigger": {
      if (catalogItemId === "trigger.external-tool") {
        const { resolveIntegrationOperationFromNode } = await import(
          "@/lib/integrations/registry"
        )
        const operation = resolveIntegrationOperationFromNode(node)
        if (!operation) {
          return {
            ok: false,
            message:
              "Configure service, provider, and a receive operation on this External Tool trigger.",
          }
        }
        const customValues = options?.triggerPayloads?.[node.id]
        if (customValues && Object.keys(customValues).length > 0) {
          return {
            ok: true,
            outputPort: resolveOutputPortId(node) ?? "main-out",
            payload: {
              ...customValues,
              triggerType:
                typeof customValues.triggerType === "string"
                  ? customValues.triggerType
                  : "email",
              triggeredAt:
                typeof customValues.triggeredAt === "string"
                  ? customValues.triggeredAt
                  : new Date().toISOString(),
            },
            message: "External tool trigger fired",
          }
        }

        const result = await operation.executePlayground({
          node,
          payload: {},
          mode: "playground",
        })
        if (!result.ok) {
          return result
        }
        return {
          ok: true,
          outputPort: resolveOutputPortId(node) ?? "main-out",
          payload: result.payload,
          message: result.message ?? "External tool trigger fired",
        }
      }

      const triggerType = String(
        node.config.triggerMode ?? node.config.triggerType ?? "manual"
      )
      const outputFields = parseOutputFieldDefs(node.config)
      if (
        (catalogItemId === "trigger.workflow" ||
          catalogItemId === "trigger.api") &&
        outputFields.length === 0
      ) {
        return {
          ok: false,
          message: "Trigger must define at least one output field",
        }
      }

      const customValues = options?.triggerPayloads?.[node.id]
      const triggerPayload =
        options?.triggerPayloads !== undefined
          ? buildTriggerPayloadFromValues(node, customValues ?? {})
          : buildTriggerPlaygroundPayload(node)

      return {
        ok: true,
        outputPort: resolveOutputPortId(node) ?? "main-out",
        payload: {
          ...triggerPayload,
          triggerType,
        },
        message: `Trigger fired (${triggerType})`,
      }
    }

    case "sequential": {
      if (
        catalogItemId === "integrations.external-tool" ||
        catalogItemId === "integrations.http-request"
      ) {
        const inputPayload =
          typeof payload === "object" && payload !== null
            ? (payload as Record<string, unknown>)
            : {}

        if (
          options?.executionMode === "production" &&
          options.integrationExecutor
        ) {
          const result = await options.integrationExecutor(node, inputPayload)
          if (!result.ok) {
            return result
          }
          return passThrough(
            node,
            result.payload,
            result.message ?? "External integration completed",
            result.outputPort ?? "main-out"
          )
        }

        const { resolveIntegrationOperationFromNode, getIntegrationOperation } =
          await import("@/lib/integrations/registry")
        const operation =
          catalogItemId === "integrations.http-request"
            ? getIntegrationOperation("api", "rest", "request")
            : resolveIntegrationOperationFromNode(node)

        if (!operation) {
          return {
            ok: false,
            message:
              catalogItemId === "integrations.http-request"
                ? "HTTP Request configuration is incomplete."
                : "Configure service, provider, and operation on this External Tool node.",
          }
        }

        const result = await operation.executePlayground({
          node,
          payload: inputPayload,
          mode: "playground",
        })

        if (!result.ok) {
          return result
        }

        return passThrough(
          node,
          result.payload,
          result.message ?? "External integration completed",
          result.outputPort ?? "main-out"
        )
      }

      if (catalogItemId === "action.code") {
        const code = node.config.code
        if (!code || String(code).trim() === "") {
          return { ok: false, message: "Code node is missing executable code" }
        }

        return passThrough(
          node,
          { ...(typeof payload === "object" && payload !== null ? payload : {}), lastAction: node.label },
          `Executed ${String(node.config.language ?? "javascript")} code (playground)`
        )
      }

      if (catalogItemId === "action.merge") {
        return passThrough(
          node,
          payload,
          "Combined both branch payloads",
          "main-out"
        )
      }

      if (catalogItemId === "action.aggregate") {
        if (!isNonEmptyString(node.config.groupByField)) {
          return {
            ok: false,
            message: "Group Items is missing a group-by field",
          }
        }

        const itemsField =
          typeof node.config.itemsField === "string"
            ? node.config.itemsField
            : undefined
        const aggregated = aggregateItemsByField(
          payload,
          String(node.config.groupByField),
          itemsField
        )
        const groupCount = Number(
          (aggregated as Record<string, unknown>).groupCount ?? 0
        )
        const itemCount = Number(
          (aggregated as Record<string, unknown>).itemCount ?? 0
        )
        const aggregatedBy = String(
          (aggregated as Record<string, unknown>).aggregatedBy ?? "field"
        )

        return passThrough(
          node,
          aggregated,
          `Grouped ${itemCount} item(s) into ${groupCount} group(s) by "${aggregatedBy}"`,
          "main-out"
        )
      }

      if (catalogItemId?.startsWith("action.")) {
        if (catalogItemId === "action.data-table") {
          return processDataTableNode(node, payload)
        }
        if (catalogItemId === "action.edit-fields") {
          const validation = validateFieldEditRows(node)
          if (!validation.ok) {
            return validation
          }

          const editedPayload = applyFieldEditsToPayload(payload, node)
          const names = validation.rows.map((row) => row.name.trim()).join(", ")

          return {
            ok: true,
            payload: editedPayload,
            message: `Applied ${validation.fieldCount} field mapping(s): ${names}`,
            fanOutOutputs: validation.rows.map((row, index) => ({
              portId: `output-${index + 1}`,
              payload: applySingleFieldEdit(payload, row),
            })),
          }
        }
        if (catalogItemId === "action.rename-keys") {
          const renames = asRenameRows(node.config.renames)
          if (renames.length === 0 || renames.some((row) => !row.fromField || !row.toField.trim())) {
            return { ok: false, message: "Rename Keys requires complete rename rows" }
          }

          return passThrough(
            node,
            applyRenamesToPayload(payload, node),
            "Renamed fields (playground)"
          )
        }
        if (
          (catalogItemId === "action.sort" && !isNonEmptyString(node.config.sortField)) ||
          (catalogItemId === "action.date-time" && !isNonEmptyString(node.config.sourceField))
        ) {
          return {
            ok: false,
            message: `${node.label} is missing a field from the previous node`,
          }
        }

        return passThrough(
          node,
          payload,
          `Completed ${node.label} (playground)`
        )
      }

      return passThrough(node, payload, `Completed ${node.label} (playground)`)
    }

    case "conditional": {
      if (catalogItemId === "condition.filter") {
        const validation = validateComparisonRule(node, "Filter")
        if (!validation.ok) {
          return validation
        }

        const matches = evaluateComparisonRule(
          payload,
          String(node.config.field),
          node.config.operator,
          String(node.config.compareValue ?? "")
        )

        if (!matches) {
          return {
            ok: true,
            payload,
            message: "Filter dropped payload (condition not met)",
            filteredOut: true,
          }
        }

        return passThrough(
          node,
          payload,
          "Filter kept payload",
          "matching-items"
        )
      }

      if (catalogItemId === "condition.switch") {
        const route = resolveSwitchOutputPort(node, payload)
        if (!route.ok) {
          return route
        }

        return passThrough(node, payload, route.message, route.portId)
      }

      if (catalogItemId === "condition.if") {
        const validation = validateComparisonRule(node, "IF")
        if (!validation.ok) {
          return validation
        }

        const matches = evaluateComparisonRule(
          payload,
          String(node.config.field),
          node.config.operator,
          String(node.config.compareValue ?? "")
        )

        return passThrough(
          node,
          payload,
          matches ? "IF evaluated → True branch" : "IF evaluated → False branch",
          matches ? "true" : "false"
        )
      }

      return passThrough(
        node,
        payload,
        "Condition evaluated (playground)",
        "true"
      )
    }

    case "parallel": {
      return {
        ok: true,
        outputPort: "branch-a",
        payload,
        message: "Parallel branches dispatched (playground)",
      }
    }

    case "loop": {
      if (catalogItemId === "loop.wait") {
        const durationMs = getWaitDurationMs(node.config)

        if (options?.completedWaits?.[node.id]) {
          return passThrough(
            node,
            mergePayload(payload, {
              waitedMs: durationMs,
              resumedAt: new Date().toISOString(),
            }),
            `Waited ${formatWaitDuration(durationMs)}`,
            "resume"
          )
        }

        return {
          ok: false,
          pendingWait: true,
          payload,
          durationMs,
          message: `Waiting for ${formatWaitDuration(durationMs)}…`,
        }
      }

      if (catalogItemId === "loop.over-items") {
        if (!isNonEmptyString(node.config.collectionField)) {
          return {
            ok: false,
            message: "Loop Over Items is missing a collection field from the previous node",
          }
        }

        const collection = resolveCollectionFromField(
          payload,
          node.config.collectionField
        )

        if (collection.length === 0) {
          return passThrough(
            node,
            mergePayload(payload, {
              loopCompleted: true,
              loopItemCount: 0,
            }),
            "Loop finished with 0 items",
            "done"
          )
        }

        return {
          ok: true,
          payload,
          message: `Looping over ${collection.length} item(s)`,
          loopItems: collection,
        }
      }

      const collectionField = node.config.collectionField ?? node.config.collectionPath
      if (!isNonEmptyString(collectionField)) {
        return {
          ok: false,
          message: "Loop is missing a collection field from the previous node",
        }
      }

      return passThrough(
        node,
        payload,
        "Loop completed (playground)",
        "done"
      )
    }

    case "approval": {
      const validation = validateApprovalConfig(node)
      if (!validation.ok) {
        return validation
      }

      const decision = options?.approvalDecisions?.[node.id]
      if (!decision) {
        return {
          ok: false,
          pendingApproval: true,
          payload,
          message: `Waiting for approval — ${describeApprovalTarget(node)}`,
        }
      }

      if (decision === "rejected") {
        return passThrough(
          node,
          appendApprovalMetadata(payload, node, "rejected"),
          `Rejected (${describeApprovalTarget(node)})`,
          "rejected"
        )
      }

      return passThrough(
        node,
        appendApprovalMetadata(payload, node, "approved"),
        `Approved (${describeApprovalTarget(node)})`,
        "approved"
      )
    }

    case "exception": {
      return passThrough(node, payload, "Exception handler passed through (playground)", "recovered")
    }

    default:
      return {
        ok: false,
        message: `Unsupported node kind: ${String(node.kind)}`,
      }
  }
}

function validateGraphStructure(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): PlaygroundStep | null {
  if (nodes.length === 0) {
    return createStep(
      "finish_fail",
      createLog("Workflow has no nodes", "error")
    )
  }

  const triggers = findTriggerNodes(nodes)
  if (triggers.length === 0) {
    return createStep(
      "finish_fail",
      createLog("Workflow must include at least one trigger node", "error")
    )
  }

  const unreachable = findUnreachableNodeIds(nodes, edges)
  if (unreachable.length > 0) {
    const labels = unreachable
      .map((id) => nodes.find((node) => node.id === id)?.label ?? id)
      .join(", ")
    return createStep(
      "finish_fail",
      createLog(`Unreachable nodes: ${labels}`, "error")
    )
  }

  for (const node of nodes) {
    if (node.kind === "trigger") {
      continue
    }

    const definition = resolveNodeDefinition(node)
    const catalogItemId = getCatalogItemId(node)

    if (catalogItemId === "action.merge") {
      const inputCount = getMergeInputCount(node)
      for (let index = 1; index <= inputCount; index += 1) {
        if (!hasMergeInputConnected(edges, node, index)) {
          return createStep(
            "finish_fail",
            createLog(
              `"${node.label}" is missing a connection on Input ${index}`,
              "error",
              node
            )
          )
        }
      }
      continue
    }

    for (const port of definition.inputs) {
      if (!port.required) {
        continue
      }

      if (!hasIncomingEdgeOnPort(edges, node, port.id)) {
        return createStep(
          "finish_fail",
          createLog(
            `"${node.label}" is missing a connection on ${port.label}`,
            "error",
            node
          )
        )
      }
    }
  }

  return null
}

export async function runPlaygroundValidation(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[] = [],
  options?: PlaygroundRunOptions
): Promise<PlaygroundRunResult> {
  logCounter = 0
  const steps: PlaygroundStep[] = []

  steps.push(
    createStep(
      "start",
      createLog("Starting playground validation run", "info")
    )
  )

  const structureError = validateGraphStructure(nodes, edges)
  if (structureError) {
    steps.push(structureError)
    return {
      passed: false,
      steps,
      errorMessage: structureError.log.message,
    }
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const outgoing = buildOutgoingEdgeMap(edges)
  const triggers = findTriggerNodes(nodes)

  type QueueItem = PlaygroundQueueItem

  const queue: QueueItem[] = triggers.map((node) => ({
    nodeId: node.id,
    payload: { playground: true },
  }))

  let failed = false
  let errorMessage: string | undefined
  const mergeBuffers = createMergeBuffer()
  const loopBuffers = createLoopCompletionBuffer()

  while (queue.length > 0 && steps.length < MAX_PLAYGROUND_STEPS && !failed) {
    const current = queue.shift()
    if (!current) {
      break
    }

    const node = nodeById.get(current.nodeId)
    if (!node) {
      continue
    }

    current.payload = ensureJsonObject(current.payload)

    const mergeArrival = handleMergeNodeArrival(
      node,
      current.payload,
      edges,
      current.viaEdgeId,
      mergeBuffers
    )

    if (mergeArrival.status === "waiting") {
      steps.push(
        createStep(
          "node_enter",
          createLog(
            formatMergeWaitingMessage(
              node,
              mergeArrival.port,
              mergeArrival.received,
              mergeArrival.expected
            ),
            "info",
            node
          ),
          { nodeId: node.id }
        )
      )
      continue
    }

    if (mergeArrival.status === "ready") {
      current.payload = mergeArrival.payload
    }

    if (current.viaEdgeId) {
      steps.push(
        createStep(
          "edge_fire",
          createLog(
            `Signal received on "${node.label}"`,
            "info",
            node
          ),
          { nodeId: node.id, edgeId: current.viaEdgeId }
        )
      )
    }

    steps.push(
      createStep(
        "node_enter",
        createLog(`Processing "${node.label}"…`, "info", node),
        {
          nodeId: node.id,
          ...(options?.capturePayloads
            ? { inputPayload: clonePayload(current.payload) }
            : {}),
        }
      )
    )

    const result = await processNodeInPlayground(node, current.payload, options)
    const definition = resolveNodeDefinition(node)

    if (!result.ok) {
      if (result.pendingApproval) {
        steps.push(
          createStep(
            "pending_approval",
            createLog(result.message, "warning", node),
            {
              nodeId: node.id,
              ...(options?.capturePayloads
                ? { inputPayload: clonePayload(current.payload) }
                : {}),
            }
          )
        )

        return {
          passed: false,
          steps,
          pendingApproval: {
            nodeId: node.id,
            nodeLabel: node.label,
            approverType: getApprovalApproverType(node.config),
            approverTarget: describeApprovalTarget(node),
            payload: clonePayload(current.payload),
          },
          continuation: {
            steps,
            queue,
            pending: {
              kind: "approval",
              nodeId: node.id,
              payload: current.payload,
              loopContext: current.loopContext,
            },
            loopCompletions: serializeLoopCompletions(loopBuffers),
          },
        }
      }

      if (result.pendingWait) {
        const durationMs = result.durationMs ?? getWaitDurationMs(node.config)
        const startedAt = Date.now()

        steps.push(
          createStep(
            "pending_wait",
            createLog(result.message, "warning", node),
            {
              nodeId: node.id,
              ...(options?.capturePayloads
                ? { inputPayload: clonePayload(current.payload) }
                : {}),
            }
          )
        )

        return {
          passed: false,
          steps,
          pendingWait: {
            nodeId: node.id,
            nodeLabel: node.label,
            durationMs,
            resumeAt: startedAt + durationMs,
            payload: clonePayload(current.payload),
          },
          continuation: {
            steps,
            queue,
            pending: {
              kind: "wait",
              nodeId: node.id,
              payload: current.payload,
              durationMs,
              startedAt,
              loopContext: current.loopContext,
            },
            loopCompletions: serializeLoopCompletions(loopBuffers),
          },
        }
      }

      failed = true
      errorMessage = result.message
      steps.push(
        createStep(
          "node_error",
          createLog(result.message, "error", node),
          {
            nodeId: node.id,
            ...(options?.capturePayloads
              ? { inputPayload: clonePayload(current.payload) }
              : {}),
          }
        )
      )
      steps.push(
        createStep(
          "finish_fail",
          createLog(`Validation failed at "${node.label}"`, "error", node)
        )
      )
      break
    }

    steps.push(
      createStep(
        "node_exit",
        createLog(result.message, "success", node),
        {
          nodeId: node.id,
          ...(options?.capturePayloads
            ? {
                inputPayload: clonePayload(current.payload),
                outputPayload: clonePayload(
                  result.loopItems
                    ? mergePayload(result.payload, {
                        loopItemCount: result.loopItems.length,
                        loopItems: result.loopItems,
                      })
                    : result.payload
                ),
              }
            : {}),
        }
      )
    )

    if (result.filteredOut) {
      enqueueChildrenWithLoopContext(
        queue,
        loopBuffers,
        outgoing,
        nodeById,
        [],
        current.loopContext
      )
      continue
    }

    if (result.loopItems) {
      fanOutLoopItems(queue, loopBuffers, outgoing, node, {
        payload: result.payload,
        loopItems: result.loopItems,
      })
      continue
    }

    const nextEdges = result.outputPort
      ? getOutgoingEdges(outgoing, node, result.outputPort)
      : []

    if (result.terminal || definition.outputs.length === 0) {
      enqueueChildrenWithLoopContext(
        queue,
        loopBuffers,
        outgoing,
        nodeById,
        [],
        current.loopContext
      )
      steps.push(
        createStep(
          "node_exit",
          createLog(`"${node.label}" terminated execution`, "info", node),
          { nodeId: node.id }
        )
      )
      continue
    }

    if (node.kind === "parallel") {
      const parallelChildren: Array<{
        nodeId: string
        payload: unknown
        viaEdgeId: string
      }> = []
      for (const port of definition.outputs) {
        const portEdges = getOutgoingEdges(outgoing, node, port.id)
        for (const edge of portEdges) {
          parallelChildren.push({
            nodeId: edge.target,
            payload: result.payload,
            viaEdgeId: edge.id,
          })
        }
      }
      enqueueChildrenWithLoopContext(
        queue,
        loopBuffers,
        outgoing,
        nodeById,
        parallelChildren,
        current.loopContext
      )
      continue
    }

    if (result.fanOutOutputs) {
      const fanChildren: Array<{
        nodeId: string
        payload: unknown
        viaEdgeId: string
      }> = []
      for (const output of result.fanOutOutputs) {
        const portEdges = getOutgoingEdges(outgoing, node, output.portId)
        for (const edge of portEdges) {
          fanChildren.push({
            nodeId: edge.target,
            payload: output.payload,
            viaEdgeId: edge.id,
          })
        }
      }
      enqueueChildrenWithLoopContext(
        queue,
        loopBuffers,
        outgoing,
        nodeById,
        fanChildren,
        current.loopContext
      )
      continue
    }

    if (nextEdges.length === 0) {
      enqueueChildrenWithLoopContext(
        queue,
        loopBuffers,
        outgoing,
        nodeById,
        [],
        current.loopContext
      )
      steps.push(
        createStep(
          "node_exit",
          createLog(`"${node.label}" is a terminal node`, "info", node),
          { nodeId: node.id }
        )
      )
      continue
    }

    enqueueChildrenWithLoopContext(
      queue,
      loopBuffers,
      outgoing,
      nodeById,
      nextEdges.map((edge) => ({
        nodeId: edge.target,
        payload: result.payload,
        viaEdgeId: edge.id,
      })),
      current.loopContext
    )
  }

  if (steps.length >= MAX_PLAYGROUND_STEPS) {
    failed = true
    errorMessage = "Playground run exceeded maximum step count (possible cycle)"
    steps.push(
      createStep(
        "finish_fail",
        createLog(errorMessage, "error")
      )
    )
  }

  if (!failed) {
    steps.push(
      createStep(
        "finish_pass",
        createLog(
          "Playground validation passed — workflow is ready to deploy",
          "success"
        )
      )
    )
  }

  return {
    passed: !failed,
    steps,
    errorMessage,
  }
}

export async function resumePlaygroundValidation(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  continuation: PlaygroundContinuationState,
  action: PlaygroundResumeAction,
  options?: PlaygroundRunOptions
): Promise<PlaygroundRunResult> {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const outgoing = buildOutgoingEdgeMap(edges)
  const steps = [...continuation.steps]
  const queue: PlaygroundQueueItem[] = [...continuation.queue]
  const pendingNode = nodeById.get(continuation.pending.nodeId)

  if (!pendingNode) {
    return {
      passed: false,
      steps,
      errorMessage: "Paused node not found",
    }
  }

  const mergedOptions: PlaygroundRunOptions = { ...options }

  if (continuation.pending.kind === "approval") {
    if (action.type !== "approval") {
      return {
        passed: false,
        steps,
        errorMessage: "Approval decision required to continue",
      }
    }

    mergedOptions.approvalDecisions = {
      ...options?.approvalDecisions,
      [continuation.pending.nodeId]: action.decision,
    }
  } else if (action.type !== "wait") {
    return {
      passed: false,
      steps,
      errorMessage: "Wait duration must elapse before continuing",
    }
  } else {
    mergedOptions.completedWaits = {
      ...options?.completedWaits,
      [continuation.pending.nodeId]: true,
    }
  }

  const result = await processNodeInPlayground(
    pendingNode,
    continuation.pending.payload,
    mergedOptions
  )

  if (!result.ok) {
    steps.push(
      createStep(
        "node_error",
        createLog(result.message, "error", pendingNode),
        { nodeId: pendingNode.id }
      )
    )
    steps.push(
      createStep(
        "finish_fail",
        createLog(`Validation failed at "${pendingNode.label}"`, "error", pendingNode)
      )
    )
    return {
      passed: false,
      steps,
      errorMessage: result.message,
    }
  }

  steps.push(
    createStep(
      "node_exit",
      createLog(result.message, "success", pendingNode),
      {
        nodeId: pendingNode.id,
        ...(options?.capturePayloads
          ? {
              inputPayload: clonePayload(continuation.pending.payload),
              outputPayload: clonePayload(result.payload),
            }
          : {}),
      }
    )
  )

  let failed = false
  let errorMessage: string | undefined
  const definition = resolveNodeDefinition(pendingNode)
  const loopBuffers = restoreLoopCompletions(continuation.loopCompletions)
  const pendingLoopContext = continuation.pending.loopContext

  if (result.filteredOut) {
    enqueueChildrenWithLoopContext(
      queue,
      loopBuffers,
      outgoing,
      nodeById,
      [],
      pendingLoopContext
    )
  } else if (result.loopItems) {
    fanOutLoopItems(queue, loopBuffers, outgoing, pendingNode, {
      payload: result.payload,
      loopItems: result.loopItems,
    })
  } else {
    const nextEdges = result.outputPort
      ? getOutgoingEdges(outgoing, pendingNode, result.outputPort)
      : []

    if (!result.terminal && definition.outputs.length > 0) {
      enqueueChildrenWithLoopContext(
        queue,
        loopBuffers,
        outgoing,
        nodeById,
        nextEdges.map((edge) => ({
          nodeId: edge.target,
          payload: result.payload,
          viaEdgeId: edge.id,
        })),
        pendingLoopContext
      )
    } else {
      enqueueChildrenWithLoopContext(
        queue,
        loopBuffers,
        outgoing,
        nodeById,
        [],
        pendingLoopContext
      )
    }
  }

  const mergeBuffers = createMergeBuffer()

  while (queue.length > 0 && steps.length < MAX_PLAYGROUND_STEPS && !failed) {
    const current = queue.shift()
    if (!current) {
      break
    }

    const node = nodeById.get(current.nodeId)
    if (!node) {
      continue
    }

    current.payload = ensureJsonObject(current.payload)

    const mergeArrival = handleMergeNodeArrival(
      node,
      current.payload,
      edges,
      current.viaEdgeId,
      mergeBuffers
    )

    if (mergeArrival.status === "waiting") {
      steps.push(
        createStep(
          "node_enter",
          createLog(
            formatMergeWaitingMessage(
              node,
              mergeArrival.port,
              mergeArrival.received,
              mergeArrival.expected
            ),
            "info",
            node
          ),
          { nodeId: node.id }
        )
      )
      continue
    }

    if (mergeArrival.status === "ready") {
      current.payload = mergeArrival.payload
    }

    if (current.viaEdgeId) {
      steps.push(
        createStep(
          "edge_fire",
          createLog(`Signal received on "${node.label}"`, "info", node),
          { nodeId: node.id, edgeId: current.viaEdgeId }
        )
      )
    }

    steps.push(
      createStep(
        "node_enter",
        createLog(`Processing "${node.label}"…`, "info", node),
        {
          nodeId: node.id,
          ...(mergedOptions?.capturePayloads
            ? { inputPayload: clonePayload(current.payload) }
            : {}),
        }
      )
    )

    const nodeResult = await processNodeInPlayground(
      node,
      current.payload,
      mergedOptions
    )
    const nodeDefinition = resolveNodeDefinition(node)

    if (!nodeResult.ok) {
      if (nodeResult.pendingApproval) {
        steps.push(
          createStep(
            "pending_approval",
            createLog(nodeResult.message, "warning", node),
            {
              nodeId: node.id,
              ...(options?.capturePayloads
                ? { inputPayload: clonePayload(current.payload) }
                : {}),
            }
          )
        )

        return {
          passed: false,
          steps,
          pendingApproval: {
            nodeId: node.id,
            nodeLabel: node.label,
            approverType: getApprovalApproverType(node.config),
            approverTarget: describeApprovalTarget(node),
            payload: clonePayload(current.payload),
          },
          continuation: {
            steps,
            queue,
            pending: {
              kind: "approval",
              nodeId: node.id,
              payload: current.payload,
              loopContext: current.loopContext,
            },
            loopCompletions: serializeLoopCompletions(loopBuffers),
          },
        }
      }

      if (nodeResult.pendingWait) {
        const durationMs =
          nodeResult.durationMs ?? getWaitDurationMs(node.config)
        const startedAt = Date.now()

        steps.push(
          createStep(
            "pending_wait",
            createLog(nodeResult.message, "warning", node),
            {
              nodeId: node.id,
              ...(options?.capturePayloads
                ? { inputPayload: clonePayload(current.payload) }
                : {}),
            }
          )
        )

        return {
          passed: false,
          steps,
          pendingWait: {
            nodeId: node.id,
            nodeLabel: node.label,
            durationMs,
            resumeAt: startedAt + durationMs,
            payload: clonePayload(current.payload),
          },
          continuation: {
            steps,
            queue,
            pending: {
              kind: "wait",
              nodeId: node.id,
              payload: current.payload,
              durationMs,
              startedAt,
              loopContext: current.loopContext,
            },
            loopCompletions: serializeLoopCompletions(loopBuffers),
          },
        }
      }

      failed = true
      errorMessage = nodeResult.message
      steps.push(
        createStep(
          "node_error",
          createLog(nodeResult.message, "error", node),
          {
            nodeId: node.id,
            ...(options?.capturePayloads
              ? { inputPayload: clonePayload(current.payload) }
              : {}),
          }
        )
      )
      steps.push(
        createStep(
          "finish_fail",
          createLog(`Validation failed at "${node.label}"`, "error", node)
        )
      )
      break
    }

    steps.push(
      createStep(
        "node_exit",
        createLog(nodeResult.message, "success", node),
        {
          nodeId: node.id,
          ...(options?.capturePayloads
            ? {
                inputPayload: clonePayload(current.payload),
                outputPayload: clonePayload(
                  nodeResult.loopItems
                    ? mergePayload(nodeResult.payload, {
                        loopItemCount: nodeResult.loopItems.length,
                        loopItems: nodeResult.loopItems,
                      })
                    : nodeResult.payload
                ),
              }
            : {}),
        }
      )
    )

    if (nodeResult.filteredOut) {
      enqueueChildrenWithLoopContext(
        queue,
        loopBuffers,
        outgoing,
        nodeById,
        [],
        current.loopContext
      )
      continue
    }

    if (nodeResult.loopItems) {
      fanOutLoopItems(queue, loopBuffers, outgoing, node, {
        payload: nodeResult.payload,
        loopItems: nodeResult.loopItems,
      })
      continue
    }

    const nextEdges = nodeResult.outputPort
      ? getOutgoingEdges(outgoing, node, nodeResult.outputPort)
      : []

    if (nodeResult.terminal || nodeDefinition.outputs.length === 0) {
      enqueueChildrenWithLoopContext(
        queue,
        loopBuffers,
        outgoing,
        nodeById,
        [],
        current.loopContext
      )
      continue
    }

    if (node.kind === "parallel") {
      const parallelChildren: Array<{
        nodeId: string
        payload: unknown
        viaEdgeId: string
      }> = []
      for (const port of nodeDefinition.outputs) {
        const portEdges = getOutgoingEdges(outgoing, node, port.id)
        for (const edge of portEdges) {
          parallelChildren.push({
            nodeId: edge.target,
            payload: nodeResult.payload,
            viaEdgeId: edge.id,
          })
        }
      }
      enqueueChildrenWithLoopContext(
        queue,
        loopBuffers,
        outgoing,
        nodeById,
        parallelChildren,
        current.loopContext
      )
      continue
    }

    if (nodeResult.fanOutOutputs) {
      const fanChildren: Array<{
        nodeId: string
        payload: unknown
        viaEdgeId: string
      }> = []
      for (const output of nodeResult.fanOutOutputs) {
        const portEdges = getOutgoingEdges(outgoing, node, output.portId)
        for (const edge of portEdges) {
          fanChildren.push({
            nodeId: edge.target,
            payload: output.payload,
            viaEdgeId: edge.id,
          })
        }
      }
      enqueueChildrenWithLoopContext(
        queue,
        loopBuffers,
        outgoing,
        nodeById,
        fanChildren,
        current.loopContext
      )
      continue
    }

    if (nextEdges.length === 0) {
      enqueueChildrenWithLoopContext(
        queue,
        loopBuffers,
        outgoing,
        nodeById,
        [],
        current.loopContext
      )
      continue
    }

    enqueueChildrenWithLoopContext(
      queue,
      loopBuffers,
      outgoing,
      nodeById,
      nextEdges.map((edge) => ({
        nodeId: edge.target,
        payload: nodeResult.payload,
        viaEdgeId: edge.id,
      })),
      current.loopContext
    )
  }

  if (steps.length >= MAX_PLAYGROUND_STEPS) {
    failed = true
    errorMessage = "Playground run exceeded maximum step count (possible cycle)"
    steps.push(
      createStep("finish_fail", createLog(errorMessage, "error"))
    )
  }

  if (!failed) {
    steps.push(
      createStep(
        "finish_pass",
        createLog(
          options?.capturePayloads
            ? "Test run completed"
            : "Playground validation passed — workflow is ready to deploy",
          "success"
        )
      )
    )
  }

  return {
    passed: !failed,
    steps,
    errorMessage,
  }
}
