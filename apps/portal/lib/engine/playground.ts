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
  PlaygroundLogEntry,
  PlaygroundRunResult,
  PlaygroundStep,
} from "@/lib/engine/types"
import {
  asEditRows,
  asRenameRows,
  asStringArray,
  normalizeSwitchCases,
} from "@/lib/design/upstream-fields"
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

function validateSwitchRules(node: WorkflowNode) {
  const caseCount = Math.max(2, Number(node.config.caseCount ?? 2))
  const includeDefault = node.config.includeDefaultOutput !== false
  const rules = normalizeSwitchCases(node.config.switchCases, caseCount, includeDefault)
  const missing = rules.find((rule) => !isNonEmptyString(rule.condition))
  if (missing) {
    return {
      ok: false as const,
      message: `Switch is missing a condition for ${missing.label}`,
    }
  }
  return { ok: true as const }
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
  extras?: Pick<PlaygroundStep, "nodeId" | "edgeId">
): PlaygroundStep {
  return {
    type,
    log,
    nodeId: extras?.nodeId ?? log.nodeId,
    edgeId: extras?.edgeId,
  }
}

type NodeProcessResult =
  | { ok: true; outputPort: string; payload: unknown; message: string; terminal?: boolean }
  | { ok: false; message: string }

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

function processNodeInPlayground(
  node: WorkflowNode,
  payload: unknown
): NodeProcessResult {
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
      const triggerType = String(node.config.triggerType ?? "manual")
      const outputFields = asStringArray(node.config.outputFields)
      if (catalogItemId === "trigger.workflow" && outputFields.length === 0) {
        return {
          ok: false,
          message: "Trigger must define at least one output field",
        }
      }

      return {
        ok: true,
        outputPort: resolveOutputPortId(node) ?? "main-out",
        payload: {
          ...(typeof payload === "object" && payload !== null ? payload : {}),
          triggeredAt: new Date().toISOString(),
          triggerType,
        },
        message: `Trigger fired (${triggerType})`,
      }
    }

    case "sequential": {
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
        return passThrough(node, payload, "Merged incoming branches (playground)")
      }

      if (catalogItemId?.startsWith("action.")) {
        if (catalogItemId === "action.data-table" && !isNonEmptyString(node.config.tableName)) {
          return { ok: false, message: "Data Table is missing a table name" }
        }
        if (catalogItemId === "action.edit-fields") {
          const edits = asEditRows(node.config.fieldEdits)
          if (edits.length === 0 || edits.some((row) => !row.name.trim() || !row.sourceField)) {
            return { ok: false, message: "Edit Fields requires mapped field rows" }
          }
        }
        if (catalogItemId === "action.rename-keys") {
          const renames = asRenameRows(node.config.renames)
          if (renames.length === 0 || renames.some((row) => !row.fromField || !row.toField.trim())) {
            return { ok: false, message: "Rename Keys requires complete rename rows" }
          }
        }
        if (
          (catalogItemId === "action.aggregate" && !isNonEmptyString(node.config.groupByField)) ||
          (catalogItemId === "action.summarize" && !isNonEmptyString(node.config.valueField)) ||
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

        return passThrough(
          node,
          payload,
          "Filtered matching items (playground)",
          "matching-items"
        )
      }

      if (catalogItemId === "condition.switch") {
        const validation = validateSwitchRules(node)
        if (!validation.ok) {
          return validation
        }

        return passThrough(
          node,
          payload,
          "Switch routed to Case 1 (playground)",
          "case-1"
        )
      }

      if (catalogItemId === "condition.if") {
        const validation = validateComparisonRule(node, "IF")
        if (!validation.ok) {
          return validation
        }

        return passThrough(
          node,
          payload,
          "IF evaluated → True branch (playground)",
          "true"
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
        return passThrough(
          node,
          payload,
          `Waited ${String(node.config.durationMs ?? 1000)}ms (playground)`,
          "resume"
        )
      }

      if (catalogItemId === "loop.over-items") {
        if (!isNonEmptyString(node.config.collectionField)) {
          return {
            ok: false,
            message: "Loop Over Items is missing a collection field from the previous node",
          }
        }

        return passThrough(
          node,
          payload,
          "Loop completed (playground)",
          "done"
        )
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
      const approver = node.config.approverEmail
      if (!approver || String(approver).trim() === "") {
        return {
          ok: false,
          message: "Approval node is missing an approver email",
        }
      }

      return passThrough(
        node,
        {
          ...(typeof payload === "object" && payload !== null ? payload : {}),
          approvedBy: String(approver),
          approvedAt: new Date().toISOString(),
        },
        `Auto-approved in playground (approver: ${approver})`,
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
      if (!hasIncomingEdgeOnPort(edges, node, "input-a")) {
        return createStep(
          "finish_fail",
          createLog(`"${node.label}" is missing a connection on Input A`, "error", node)
        )
      }
      if (!hasIncomingEdgeOnPort(edges, node, "input-b")) {
        return createStep(
          "finish_fail",
          createLog(`"${node.label}" is missing a connection on Input B`, "error", node)
        )
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

export function runPlaygroundValidation(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[] = []
): PlaygroundRunResult {
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

  type QueueItem = {
    nodeId: string
    payload: unknown
    viaEdgeId?: string
  }

  const queue: QueueItem[] = triggers.map((node) => ({
    nodeId: node.id,
    payload: { playground: true },
  }))

  let failed = false
  let errorMessage: string | undefined

  while (queue.length > 0 && steps.length < MAX_PLAYGROUND_STEPS && !failed) {
    const current = queue.shift()
    if (!current) {
      break
    }

    const node = nodeById.get(current.nodeId)
    if (!node) {
      continue
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
        { nodeId: node.id }
      )
    )

    const result = processNodeInPlayground(node, current.payload)
    const definition = resolveNodeDefinition(node)

    if (!result.ok) {
      failed = true
      errorMessage = result.message
      steps.push(
        createStep(
          "node_error",
          createLog(result.message, "error", node),
          { nodeId: node.id }
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
        { nodeId: node.id }
      )
    )

    const nextEdges = result.outputPort
      ? getOutgoingEdges(outgoing, node, result.outputPort)
      : []

    if (result.terminal || definition.outputs.length === 0) {
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
      for (const port of definition.outputs) {
        const portEdges = getOutgoingEdges(outgoing, node, port.id)
        for (const edge of portEdges) {
          queue.push({
            nodeId: edge.target,
            payload: result.payload,
            viaEdgeId: edge.id,
          })
        }
      }
      continue
    }

    if (nextEdges.length === 0) {
      steps.push(
        createStep(
          "node_exit",
          createLog(`"${node.label}" is a terminal node`, "info", node),
          { nodeId: node.id }
        )
      )
      continue
    }

    for (const edge of nextEdges) {
      queue.push({
        nodeId: edge.target,
        payload: result.payload,
        viaEdgeId: edge.id,
      })
    }
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
