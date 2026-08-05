import type { WorkflowTemplate } from "@/lib/domain/template"
import type { NodeConfig, WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import { getComponentCatalogItemById } from "@/lib/design/component-catalog"
import { createNodeFromCatalogItem } from "@/lib/design/node-utils"
import {
  resolveInputPortId,
  resolveOutputPortId,
} from "@/lib/design/node-layout"
import { createEdge } from "@/lib/design/workflow-graph"
import type { TriggerSchedule } from "@/lib/domain/trigger-schedule"

/**
 * Templates are authored on a lane grid instead of a single row so branches,
 * loops, and merges stay readable the moment they land on the canvas.
 * A column is one step forward; a row is one parallel lane. Rows may be
 * fractional to nudge a branch between two lanes.
 */
const COLUMN_STRIDE = 400
const ROW_STRIDE = 150

type GridCell = readonly [column: number, row: number]

function position(cell: GridCell) {
  return {
    x: Math.round(cell[0] * COLUMN_STRIDE),
    y: Math.round(cell[1] * ROW_STRIDE),
  }
}

function fieldRef(nodeId: string, fieldName: string) {
  return `${nodeId}.${fieldName}`
}

function templateNode(
  id: string,
  catalogItemId: string,
  label: string,
  cell: GridCell,
  config: NodeConfig = {}
): WorkflowNode {
  const item = getComponentCatalogItemById(catalogItemId)
  if (!item) {
    throw new Error(`Unknown catalog item: ${catalogItemId}`)
  }

  const node = createNodeFromCatalogItem(item)

  return {
    ...node,
    id,
    label,
    position: position(cell),
    config: {
      ...node.config,
      ...config,
      catalogItemId: item.id,
    },
  }
}

function connect(
  source: string,
  target: string,
  sourcePort = "main-out",
  targetPort = "main-in"
): WorkflowEdge {
  return createEdge(source, target, { sourcePort, targetPort })
}

/**
 * Store the port ids the editor would store. Components such as Edit Fields and
 * Combine Branches expose numbered ports instead of `main-in`/`main-out`, so
 * resolve the aliases once here rather than leaning on runtime fallbacks.
 */
function buildGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  const resolvedEdges = edges.map((edge) => {
    const source = nodeById.get(edge.source)
    const target = nodeById.get(edge.target)

    if (!source || !target) {
      throw new Error(`Template edge references a missing node: ${edge.id}`)
    }

    return {
      ...edge,
      sourcePort: resolveOutputPortId(source, edge.sourcePort),
      targetPort: resolveInputPortId(target, edge.targetPort),
    }
  })

  return { nodes, edges: resolvedEdges }
}

/** Weekday schedules are stored in UTC so the template renders the same for everyone. */
function weekdaySchedule(hour: number, minute = 0): TriggerSchedule {
  return {
    version: 1,
    repeat: "weekdays",
    hour,
    minute,
    timezoneOffsetMinutes: 0,
  }
}

function manualTrigger(fields: { name: string; type: "string" | "array" }[]) {
  return {
    triggerMode: "manual",
    triggerType: "manual",
    outputFields: fields.map((field) => field.name),
    outputFieldDefs: fields,
  }
}

/**
 * Starter — the smallest useful shape: declare trigger fields, reshape them,
 * then persist. Three nodes so a first-time user can run it immediately.
 */
const starterNodes = {
  trigger: templateNode("tpl-s1", "trigger.workflow", "Record received", [0, 0], {
    ...manualTrigger([
      { name: "recordId", type: "string" },
      { name: "customerName", type: "string" },
      { name: "amount", type: "string" },
    ]),
  }),
  shape: templateNode("tpl-s2", "action.edit-fields", "Shape the record", [1, 0], {
    fieldCount: 3,
    fieldEdits: [
      { name: "recordId", sourceField: fieldRef("tpl-s1", "recordId") },
      { name: "customer", sourceField: fieldRef("tpl-s1", "customerName") },
      { name: "amount", sourceField: fieldRef("tpl-s1", "amount") },
    ],
  }),
  store: templateNode("tpl-s3", "action.data-table", "Save to table", [2, 0], {
    operation: "write",
    writeMode: "insert",
  }),
}

const starterGraph = buildGraph(
  [starterNodes.trigger, starterNodes.shape, starterNodes.store],
  [
    connect(starterNodes.trigger.id, starterNodes.shape.id),
    connect(starterNodes.shape.id, starterNodes.store.id),
  ]
)

/**
 * Approvals — IF gate splits into a human sign-off lane (approved / rejected)
 * and an auto-approve lane for small amounts.
 */
const approvalNodes = {
  trigger: templateNode("tpl-a1", "trigger.workflow", "Purchase request", [0, 2], {
    ...manualTrigger([
      { name: "requestId", type: "string" },
      { name: "amount", type: "string" },
      { name: "department", type: "string" },
      { name: "requester", type: "string" },
    ]),
  }),
  normalize: templateNode(
    "tpl-a2",
    "action.edit-fields",
    "Normalize request",
    [1, 2],
    {
      fieldCount: 3,
      fieldEdits: [
        { name: "requestId", sourceField: fieldRef("tpl-a1", "requestId") },
        { name: "amount", sourceField: fieldRef("tpl-a1", "amount") },
        { name: "department", sourceField: fieldRef("tpl-a1", "department") },
      ],
    }
  ),
  gate: templateNode("tpl-a3", "condition.if", "Over $500?", [2, 2], {
    field: fieldRef("tpl-a1", "amount"),
    operator: "greater_than",
    compareValue: "500",
  }),
  approval: templateNode("tpl-a4", "approval.base", "Manager sign-off", [3, 1], {
    approverType: "manual",
  }),
  approved: templateNode(
    "tpl-a5",
    "action.edit-fields",
    "Record approval",
    [4, 0.5],
    {
      fieldCount: 2,
      fieldEdits: [
        { name: "approvedRequest", sourceField: fieldRef("tpl-a1", "requestId") },
        { name: "approvedAmount", sourceField: fieldRef("tpl-a1", "amount") },
      ],
    }
  ),
  rejected: templateNode(
    "tpl-a6",
    "exception.stop-and-error",
    "Stop on rejection",
    [4, 1.5],
    {
      errorMessage: "Purchase request was rejected by the approver.",
    }
  ),
  auto: templateNode("tpl-a7", "action.edit-fields", "Auto-approve", [3, 3], {
    fieldCount: 2,
    fieldEdits: [
      { name: "autoApproved", sourceField: fieldRef("tpl-a1", "requestId") },
      { name: "autoAmount", sourceField: fieldRef("tpl-a1", "amount") },
    ],
  }),
}

const approvalGraph = buildGraph(
  [
    approvalNodes.trigger,
    approvalNodes.normalize,
    approvalNodes.gate,
    approvalNodes.approval,
    approvalNodes.approved,
    approvalNodes.rejected,
    approvalNodes.auto,
  ],
  [
    connect(approvalNodes.trigger.id, approvalNodes.normalize.id),
    connect(approvalNodes.normalize.id, approvalNodes.gate.id),
    connect(approvalNodes.gate.id, approvalNodes.approval.id, "true"),
    connect(approvalNodes.approval.id, approvalNodes.approved.id, "approved"),
    connect(approvalNodes.approval.id, approvalNodes.rejected.id, "rejected"),
    connect(approvalNodes.gate.id, approvalNodes.auto.id, "false"),
  ]
)

/**
 * Data ops — array trigger, group, loop per item, then a parallel fan-out that
 * rejoins through Combine Branches.
 */
const batchNodes = {
  trigger: templateNode("tpl-b1", "trigger.workflow", "Orders imported", [0, 2], {
    ...manualTrigger([
      { name: "batchId", type: "string" },
      { name: "status", type: "string" },
      { name: "orders", type: "array" },
    ]),
  }),
  group: templateNode("tpl-b2", "action.aggregate", "Group by status", [1, 2], {
    itemsField: fieldRef("tpl-b1", "orders"),
    groupByField: fieldRef("tpl-b1", "status"),
  }),
  loop: templateNode("tpl-b3", "loop.over-items", "For each order", [2, 2], {
    collectionField: fieldRef("tpl-b1", "orders"),
  }),
  item: templateNode("tpl-b4", "action.edit-fields", "Normalize order", [3, 3], {
    fieldCount: 2,
    fieldEdits: [
      { name: "batchId", sourceField: fieldRef("tpl-b1", "batchId") },
      { name: "orderIndex", sourceField: fieldRef("tpl-b3", "loopIndex") },
    ],
  }),
  fanOut: templateNode("tpl-b5", "parallel.base", "Fan out finalizers", [3, 1], {
    maxConcurrency: 2,
  }),
  summary: templateNode("tpl-b6", "action.edit-fields", "Build summary", [4, 0], {
    fieldCount: 2,
    fieldEdits: [
      { name: "batchId", sourceField: fieldRef("tpl-b1", "batchId") },
      { name: "groupCount", sourceField: fieldRef("tpl-b2", "groupCount") },
    ],
  }),
  audit: templateNode("tpl-b7", "action.edit-fields", "Build audit trail", [4, 2], {
    fieldCount: 2,
    fieldEdits: [
      { name: "batchId", sourceField: fieldRef("tpl-b1", "batchId") },
      { name: "itemCount", sourceField: fieldRef("tpl-b2", "itemCount") },
    ],
  }),
  merge: templateNode("tpl-b8", "action.merge", "Combine branches", [5, 1], {
    inputCount: 2,
  }),
  sort: templateNode("tpl-b9", "action.sort", "Sort batch output", [6, 1], {
    sortField: fieldRef("tpl-b1", "batchId"),
    direction: "asc",
  }),
}

const batchGraph = buildGraph(
  [
    batchNodes.trigger,
    batchNodes.group,
    batchNodes.loop,
    batchNodes.item,
    batchNodes.fanOut,
    batchNodes.summary,
    batchNodes.audit,
    batchNodes.merge,
    batchNodes.sort,
  ],
  [
    connect(batchNodes.trigger.id, batchNodes.group.id),
    connect(batchNodes.group.id, batchNodes.loop.id),
    connect(batchNodes.loop.id, batchNodes.item.id, "loop"),
    connect(batchNodes.loop.id, batchNodes.fanOut.id, "done"),
    connect(batchNodes.fanOut.id, batchNodes.summary.id, "branch-a"),
    connect(batchNodes.fanOut.id, batchNodes.audit.id, "branch-b"),
    connect(batchNodes.summary.id, batchNodes.merge.id, "main-out", "input-1"),
    connect(batchNodes.audit.id, batchNodes.merge.id, "main-out", "input-2"),
    connect(batchNodes.merge.id, batchNodes.sort.id),
  ]
)

/**
 * Routing — Switch with three predefined cases plus a fallback lane, and a
 * Wait cool-down on the hottest path.
 */
const leadRoutingNodes = {
  trigger: templateNode("tpl-c1", "trigger.workflow", "Lead scored", [0, 2], {
    ...manualTrigger([
      { name: "leadId", type: "string" },
      { name: "score", type: "string" },
      { name: "region", type: "string" },
    ]),
  }),
  route: templateNode("tpl-c2", "condition.switch", "Route by score", [1, 2], {
    caseCount: 3,
    includeDefaultOutput: true,
    switchCases: [
      {
        portId: "case-1",
        label: "Hot (80+)",
        field: fieldRef("tpl-c1", "score"),
        operator: "greater_than",
        compareValue: "80",
      },
      {
        portId: "case-2",
        label: "Warm (50+)",
        field: fieldRef("tpl-c1", "score"),
        operator: "greater_than",
        compareValue: "50",
      },
      {
        portId: "case-3",
        label: "Cool (25+)",
        field: fieldRef("tpl-c1", "score"),
        operator: "greater_than",
        compareValue: "25",
      },
      {
        portId: "default",
        label: "Unqualified",
        field: "",
        operator: "equals",
        compareValue: "",
      },
    ],
  }),
  hotWait: templateNode("tpl-c3", "loop.wait", "Hot lead cool-down", [2, 0], {
    durationMs: 3000,
  }),
  hotAssign: templateNode(
    "tpl-c4",
    "action.edit-fields",
    "Assign to sales",
    [3, 0],
    {
      fieldCount: 2,
      fieldEdits: [
        { name: "leadId", sourceField: fieldRef("tpl-c1", "leadId") },
        { name: "tier", sourceField: fieldRef("tpl-c1", "score") },
      ],
    }
  ),
  warm: templateNode("tpl-c5", "action.edit-fields", "Queue for nurture", [2, 1.5], {
    fieldCount: 2,
    fieldEdits: [
      { name: "leadId", sourceField: fieldRef("tpl-c1", "leadId") },
      { name: "region", sourceField: fieldRef("tpl-c1", "region") },
    ],
  }),
  cool: templateNode("tpl-c6", "action.edit-fields", "Add to newsletter", [2, 3], {
    fieldCount: 1,
    fieldEdits: [
      { name: "leadId", sourceField: fieldRef("tpl-c1", "leadId") },
    ],
  }),
  unqualified: templateNode(
    "tpl-c7",
    "condition.filter",
    "Keep EMEA only",
    [2, 4.5],
    {
      field: fieldRef("tpl-c1", "region"),
      operator: "equals",
      compareValue: "emea",
    }
  ),
  archive: templateNode("tpl-c8", "action.edit-fields", "Archive lead", [3, 4.5], {
    fieldCount: 1,
    fieldEdits: [
      { name: "archivedLead", sourceField: fieldRef("tpl-c1", "leadId") },
    ],
  }),
}

const leadRoutingGraph = buildGraph(
  [
    leadRoutingNodes.trigger,
    leadRoutingNodes.route,
    leadRoutingNodes.hotWait,
    leadRoutingNodes.hotAssign,
    leadRoutingNodes.warm,
    leadRoutingNodes.cool,
    leadRoutingNodes.unqualified,
    leadRoutingNodes.archive,
  ],
  [
    connect(leadRoutingNodes.trigger.id, leadRoutingNodes.route.id),
    connect(leadRoutingNodes.route.id, leadRoutingNodes.hotWait.id, "case-1"),
    connect(leadRoutingNodes.hotWait.id, leadRoutingNodes.hotAssign.id, "resume"),
    connect(leadRoutingNodes.route.id, leadRoutingNodes.warm.id, "case-2"),
    connect(leadRoutingNodes.route.id, leadRoutingNodes.cool.id, "case-3"),
    connect(leadRoutingNodes.route.id, leadRoutingNodes.unqualified.id, "default"),
    connect(
      leadRoutingNodes.unqualified.id,
      leadRoutingNodes.archive.id,
      "matching-items"
    ),
  ]
)

/**
 * Scheduled — weekday alarm trigger that forks a full vs. incremental sync,
 * calls an HTTP API on each lane, then rejoins before writing to a table.
 */
const scheduledSyncNodes = {
  trigger: templateNode("tpl-d1", "trigger.workflow", "Weekday 8:00 AM", [0, 1.5], {
    triggerMode: "schedule",
    triggerType: "schedule",
    schedule: weekdaySchedule(8),
    outputFields: ["syncKey", "mode"],
    outputFieldDefs: [
      { name: "syncKey", type: "string" },
      { name: "mode", type: "string" },
    ],
  }),
  gate: templateNode("tpl-d2", "condition.if", "Full sync?", [1, 1.5], {
    field: fieldRef("tpl-d1", "mode"),
    operator: "equals",
    compareValue: "full",
  }),
  fullFetch: templateNode(
    "tpl-d3",
    "integrations.http-request",
    "Fetch all records",
    [2, 0.5],
    {
      method: "GET",
      urlText: "https://api.example.com/v1/records",
      timeoutMs: 15000,
    }
  ),
  incrementalFetch: templateNode(
    "tpl-d4",
    "integrations.http-request",
    "Fetch changed records",
    [2, 2.5],
    {
      method: "GET",
      urlText: "https://api.example.com/v1/records?since=last-run",
      timeoutMs: 15000,
    }
  ),
  fullTag: templateNode("tpl-d5", "action.edit-fields", "Tag full sync", [3, 0.5], {
    fieldCount: 2,
    fieldEdits: [
      { name: "syncKey", sourceField: fieldRef("tpl-d1", "syncKey") },
      { name: "syncMode", sourceField: fieldRef("tpl-d1", "mode") },
    ],
  }),
  incrementalTag: templateNode(
    "tpl-d6",
    "action.edit-fields",
    "Tag incremental sync",
    [3, 2.5],
    {
      fieldCount: 2,
      fieldEdits: [
        { name: "syncKey", sourceField: fieldRef("tpl-d1", "syncKey") },
        { name: "syncMode", sourceField: fieldRef("tpl-d1", "mode") },
      ],
    }
  ),
  merge: templateNode("tpl-d7", "action.merge", "Combine sync lanes", [4, 1.5], {
    inputCount: 2,
  }),
  store: templateNode("tpl-d8", "action.data-table", "Upsert records", [5, 1.5], {
    operation: "write",
    writeMode: "upsert",
  }),
}

const scheduledSyncGraph = buildGraph(
  [
    scheduledSyncNodes.trigger,
    scheduledSyncNodes.gate,
    scheduledSyncNodes.fullFetch,
    scheduledSyncNodes.incrementalFetch,
    scheduledSyncNodes.fullTag,
    scheduledSyncNodes.incrementalTag,
    scheduledSyncNodes.merge,
    scheduledSyncNodes.store,
  ],
  [
    connect(scheduledSyncNodes.trigger.id, scheduledSyncNodes.gate.id),
    connect(scheduledSyncNodes.gate.id, scheduledSyncNodes.fullFetch.id, "true"),
    connect(
      scheduledSyncNodes.gate.id,
      scheduledSyncNodes.incrementalFetch.id,
      "false"
    ),
    connect(scheduledSyncNodes.fullFetch.id, scheduledSyncNodes.fullTag.id),
    connect(
      scheduledSyncNodes.incrementalFetch.id,
      scheduledSyncNodes.incrementalTag.id
    ),
    connect(
      scheduledSyncNodes.fullTag.id,
      scheduledSyncNodes.merge.id,
      "main-out",
      "input-1"
    ),
    connect(
      scheduledSyncNodes.incrementalTag.id,
      scheduledSyncNodes.merge.id,
      "main-out",
      "input-2"
    ),
    connect(scheduledSyncNodes.merge.id, scheduledSyncNodes.store.id),
  ]
)

/**
 * Webhooks — public endpoint that validates the payload before it touches
 * storage, then debounces and emits an outbound webhook.
 */
const webhookIntakeNodes = {
  trigger: templateNode("tpl-e1", "trigger.workflow", "Webhook received", [0, 1], {
    triggerMode: "webhook",
    triggerType: "webhook",
    authMode: "none",
    outputFields: ["eventId", "email", "source"],
    outputFieldDefs: [
      { name: "eventId", type: "string" },
      { name: "email", type: "string" },
      { name: "source", type: "string" },
    ],
  }),
  rename: templateNode(
    "tpl-e2",
    "action.rename-keys",
    "Standardize keys",
    [1, 1],
    {
      renames: [{ fromField: "source", toField: "channel" }],
    }
  ),
  guard: templateNode("tpl-e3", "condition.if", "Valid email?", [2, 1], {
    field: fieldRef("tpl-e1", "email"),
    operator: "contains",
    compareValue: "@",
  }),
  store: templateNode("tpl-e4", "action.data-table", "Save contact", [3, 0], {
    operation: "write",
    writeMode: "upsert",
  }),
  debounce: templateNode("tpl-e5", "loop.wait", "Debounce 5s", [4, 0], {
    durationMs: 5000,
  }),
  notify: templateNode(
    "tpl-e6",
    "integrations.external-tool",
    "Notify downstream",
    [5, 0],
    {
      service: "webhook",
      provider: "webhook",
      operation: "emit",
      urlText: "https://hooks.example.com/contact-created",
      authMode: "none",
    }
  ),
  reject: templateNode(
    "tpl-e7",
    "exception.stop-and-error",
    "Reject payload",
    [3, 2],
    {
      errorMessage: "Webhook payload is missing a valid email address.",
    }
  ),
}

const webhookIntakeGraph = buildGraph(
  [
    webhookIntakeNodes.trigger,
    webhookIntakeNodes.rename,
    webhookIntakeNodes.guard,
    webhookIntakeNodes.store,
    webhookIntakeNodes.debounce,
    webhookIntakeNodes.notify,
    webhookIntakeNodes.reject,
  ],
  [
    connect(webhookIntakeNodes.trigger.id, webhookIntakeNodes.rename.id),
    connect(webhookIntakeNodes.rename.id, webhookIntakeNodes.guard.id),
    connect(webhookIntakeNodes.guard.id, webhookIntakeNodes.store.id, "true"),
    connect(webhookIntakeNodes.store.id, webhookIntakeNodes.debounce.id),
    connect(
      webhookIntakeNodes.debounce.id,
      webhookIntakeNodes.notify.id,
      "resume"
    ),
    connect(webhookIntakeNodes.guard.id, webhookIntakeNodes.reject.id, "false"),
  ]
)

/**
 * Routing — priority triage that pairs a Switch with a parallel escalation
 * fan-out, so urgent tickets page and log at the same time.
 */
const ticketTriageNodes = {
  trigger: templateNode("tpl-f1", "trigger.workflow", "Ticket created", [0, 2], {
    ...manualTrigger([
      { name: "ticketId", type: "string" },
      { name: "priority", type: "string" },
      { name: "region", type: "string" },
      { name: "tags", type: "array" },
    ]),
  }),
  route: templateNode("tpl-f2", "condition.switch", "Route by priority", [1, 2], {
    caseCount: 3,
    includeDefaultOutput: true,
    switchCases: [
      {
        portId: "case-1",
        label: "Urgent",
        field: fieldRef("tpl-f1", "priority"),
        operator: "equals",
        compareValue: "urgent",
      },
      {
        portId: "case-2",
        label: "High",
        field: fieldRef("tpl-f1", "priority"),
        operator: "equals",
        compareValue: "high",
      },
      {
        portId: "case-3",
        label: "Normal",
        field: fieldRef("tpl-f1", "priority"),
        operator: "equals",
        compareValue: "normal",
      },
      {
        portId: "default",
        label: "Backlog",
        field: "",
        operator: "equals",
        compareValue: "",
      },
    ],
  }),
  escalate: templateNode("tpl-f3", "parallel.base", "Escalate urgent", [2, 0], {
    maxConcurrency: 2,
  }),
  page: templateNode("tpl-f4", "action.edit-fields", "Page on-call", [3, -0.75], {
    fieldCount: 2,
    fieldEdits: [
      { name: "pagedTicket", sourceField: fieldRef("tpl-f1", "ticketId") },
      { name: "pagedRegion", sourceField: fieldRef("tpl-f1", "region") },
    ],
  }),
  logEscalation: templateNode(
    "tpl-f5",
    "action.edit-fields",
    "Log escalation",
    [3, 0.75],
    {
      fieldCount: 2,
      fieldEdits: [
        { name: "escalatedTicket", sourceField: fieldRef("tpl-f1", "ticketId") },
        { name: "escalatedPriority", sourceField: fieldRef("tpl-f1", "priority") },
      ],
    }
  ),
  escalationDone: templateNode(
    "tpl-f6",
    "action.merge",
    "Escalation complete",
    [4, 0],
    {
      inputCount: 2,
    }
  ),
  hold: templateNode("tpl-f7", "loop.wait", "Hold 30s", [2, 2], {
    durationMs: 30000,
  }),
  assignSenior: templateNode(
    "tpl-f8",
    "action.edit-fields",
    "Assign senior agent",
    [3, 2],
    {
      fieldCount: 1,
      fieldEdits: [
        { name: "assignedTicket", sourceField: fieldRef("tpl-f1", "ticketId") },
      ],
    }
  ),
  assignQueue: templateNode(
    "tpl-f9",
    "action.edit-fields",
    "Assign to queue",
    [2, 3.25],
    {
      fieldCount: 2,
      fieldEdits: [
        { name: "queuedTicket", sourceField: fieldRef("tpl-f1", "ticketId") },
        { name: "queuedRegion", sourceField: fieldRef("tpl-f1", "region") },
      ],
    }
  ),
  backlog: templateNode(
    "tpl-f10",
    "action.edit-fields",
    "Send to backlog",
    [2, 4.5],
    {
      fieldCount: 1,
      fieldEdits: [
        { name: "backlogTicket", sourceField: fieldRef("tpl-f1", "ticketId") },
      ],
    }
  ),
}

const ticketTriageGraph = buildGraph(
  [
    ticketTriageNodes.trigger,
    ticketTriageNodes.route,
    ticketTriageNodes.escalate,
    ticketTriageNodes.page,
    ticketTriageNodes.logEscalation,
    ticketTriageNodes.escalationDone,
    ticketTriageNodes.hold,
    ticketTriageNodes.assignSenior,
    ticketTriageNodes.assignQueue,
    ticketTriageNodes.backlog,
  ],
  [
    connect(ticketTriageNodes.trigger.id, ticketTriageNodes.route.id),
    connect(ticketTriageNodes.route.id, ticketTriageNodes.escalate.id, "case-1"),
    connect(ticketTriageNodes.escalate.id, ticketTriageNodes.page.id, "branch-a"),
    connect(
      ticketTriageNodes.escalate.id,
      ticketTriageNodes.logEscalation.id,
      "branch-b"
    ),
    connect(
      ticketTriageNodes.page.id,
      ticketTriageNodes.escalationDone.id,
      "main-out",
      "input-1"
    ),
    connect(
      ticketTriageNodes.logEscalation.id,
      ticketTriageNodes.escalationDone.id,
      "main-out",
      "input-2"
    ),
    connect(ticketTriageNodes.route.id, ticketTriageNodes.hold.id, "case-2"),
    connect(ticketTriageNodes.hold.id, ticketTriageNodes.assignSenior.id, "resume"),
    connect(ticketTriageNodes.route.id, ticketTriageNodes.assignQueue.id, "case-3"),
    connect(ticketTriageNodes.route.id, ticketTriageNodes.backlog.id, "default"),
  ]
)

export const templateCatalog: WorkflowTemplate[] = [
  {
    id: "starter-record-intake",
    name: "Record Intake Starter",
    description:
      "Three-node starting point: declare trigger fields, reshape them with Edit Fields, then write a row. Pick your table in the last step and run it from Testing.",
    category: "Starter",
    nodeCount: starterGraph.nodes.length,
    usageCount: 0,
    tags: ["starter", "edit-fields", "data-table"],
    source: "provider",
    nodes: starterGraph.nodes,
    edges: starterGraph.edges,
  },
  {
    id: "approval-gateway",
    name: "Purchase Approval Gateway",
    description:
      "Routes purchase requests on amount: over $500 waits for a manager sign-off with approved and rejected lanes, everything else auto-approves. Try amount 1200, then 200.",
    category: "Approvals",
    nodeCount: approvalGraph.nodes.length,
    usageCount: 0,
    tags: ["approval", "if", "edit-fields", "stop-and-error"],
    source: "provider",
    nodes: approvalGraph.nodes,
    edges: approvalGraph.edges,
  },
  {
    id: "batch-order-processing",
    name: "Batch Order Processing",
    description:
      "Groups an order array by status, loops each order, then fans out summary and audit branches that rejoin through Combine Branches. Enter orders as comma-separated IDs.",
    category: "Data ops",
    nodeCount: batchGraph.nodes.length,
    usageCount: 0,
    tags: ["loop", "aggregate", "parallel", "merge", "sort", "array"],
    source: "provider",
    nodes: batchGraph.nodes,
    edges: batchGraph.edges,
  },
  {
    id: "lead-routing",
    name: "Lead Scoring Router",
    description:
      "Switch with hot, warm, and cool score bands plus an unqualified fallback that filters by region. The hot lane pauses on a Wait before assignment. Try score 85, 65, 30, or 10.",
    category: "Routing",
    nodeCount: leadRoutingGraph.nodes.length,
    usageCount: 0,
    tags: ["switch", "wait", "filter", "edit-fields"],
    source: "provider",
    nodes: leadRoutingGraph.nodes,
    edges: leadRoutingGraph.edges,
  },
  {
    id: "scheduled-api-sync",
    name: "Scheduled API Sync",
    description:
      "Fires every weekday at 08:00 UTC, forks a full or incremental HTTP fetch on the mode field, then rejoins and upserts into a table. Adjust the alarm and pick your table before deploying.",
    category: "Scheduled",
    nodeCount: scheduledSyncGraph.nodes.length,
    usageCount: 0,
    tags: ["schedule", "http-request", "merge", "data-table", "upsert"],
    source: "provider",
    nodes: scheduledSyncGraph.nodes,
    edges: scheduledSyncGraph.edges,
  },
  {
    id: "webhook-intake-guard",
    name: "Webhook Intake Guard",
    description:
      "Validates an inbound webhook payload before it reaches storage: valid emails are upserted, debounced, and forwarded to an outbound webhook, invalid ones stop with an error.",
    category: "Webhooks",
    nodeCount: webhookIntakeGraph.nodes.length,
    usageCount: 0,
    tags: ["webhook", "rename-keys", "if", "data-table", "stop-and-error"],
    source: "provider",
    nodes: webhookIntakeGraph.nodes,
    edges: webhookIntakeGraph.edges,
  },
  {
    id: "ticket-triage",
    name: "Support Ticket Triage",
    description:
      "Priority switch with four lanes. Urgent tickets fan out to page on-call and log the escalation in parallel, high priority holds before assignment, and the rest queue or fall to backlog.",
    category: "Routing",
    nodeCount: ticketTriageGraph.nodes.length,
    usageCount: 0,
    tags: ["switch", "parallel", "merge", "wait", "edit-fields"],
    source: "provider",
    nodes: ticketTriageGraph.nodes,
    edges: ticketTriageGraph.edges,
  },
]

export async function listTemplates(): Promise<WorkflowTemplate[]> {
  return templateCatalog
}
