import type { WorkflowTemplate } from "@/lib/domain/template"
import type { NodeConfig, WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import { getComponentCatalogItemById } from "@/lib/design/component-catalog"
import { createNodeFromCatalogItem } from "@/lib/design/node-utils"
import { createEdge } from "@/lib/design/workflow-graph"

function fieldRef(nodeId: string, fieldName: string) {
  return `${nodeId}.${fieldName}`
}

function templateNode(
  id: string,
  catalogItemId: string,
  label: string,
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

function buildGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  return { nodes, edges }
}

/**
 * Template 1 — JSON trigger, multi-field Edit Fields, IF, manual approval pause.
 * Test payload: { "requestId": "req-42", "amount": "1200", "department": "finance" }
 */
const approvalLabNodes = {
  trigger: templateNode("demo-a1", "trigger.workflow", "Purchase request", {
    triggerType: "manual",
    outputFields: ["requestId", "amount", "department"],
    outputFieldDefs: [
      { name: "requestId", type: "string" },
      { name: "amount", type: "string" },
      { name: "department", type: "string" },
    ],
  }),
  normalize: templateNode("demo-a2", "action.edit-fields", "Normalize payload", {
    fieldCount: 2,
    fieldEdits: [
      {
        name: "requestId",
        sourceField: fieldRef("demo-a1", "requestId"),
      },
      {
        name: "amount",
        sourceField: fieldRef("demo-a1", "amount"),
      },
    ],
  }),
  reviewGate: templateNode("demo-a3", "condition.if", "Needs approval?", {
    field: fieldRef("demo-a1", "amount"),
    operator: "greater_than",
    compareValue: "500",
  }),
  approval: templateNode("demo-a4", "approval.base", "Manager sign-off", {
    approverType: "manual",
  }),
  approvedEdit: templateNode("demo-a4b", "action.edit-fields", "Mark approved", {
    fieldCount: 2,
    fieldEdits: [
      {
        name: "approvedRequestId",
        sourceField: fieldRef("demo-a1", "requestId"),
      },
      {
        name: "approvedAmount",
        sourceField: fieldRef("demo-a1", "amount"),
      },
    ],
  }),
  autoEdit: templateNode("demo-a5", "action.edit-fields", "Auto-approve", {
    fieldCount: 1,
    fieldEdits: [
      {
        name: "autoApproved",
        sourceField: fieldRef("demo-a1", "requestId"),
      },
    ],
  }),
}

const approvalLabGraph = buildGraph(
  [
    approvalLabNodes.trigger,
    approvalLabNodes.normalize,
    approvalLabNodes.reviewGate,
    approvalLabNodes.approval,
    approvalLabNodes.approvedEdit,
    approvalLabNodes.autoEdit,
  ],
  [
    connect(approvalLabNodes.trigger.id, approvalLabNodes.normalize.id),
    connect(approvalLabNodes.normalize.id, approvalLabNodes.reviewGate.id),
    connect(
      approvalLabNodes.reviewGate.id,
      approvalLabNodes.approval.id,
      "true",
      "main-in"
    ),
    connect(approvalLabNodes.approval.id, approvalLabNodes.approvedEdit.id),
    connect(
      approvalLabNodes.reviewGate.id,
      approvalLabNodes.autoEdit.id,
      "false",
      "main-in"
    ),
  ]
)

/**
 * Template 2 — Array trigger, loop, multi Edit Fields, parallel branches, merge.
 * Test payload (per-field): batchId = batch-2024-01, orders = ord-1, ord-2, ord-3
 */
const batchLabNodes = {
  trigger: templateNode("demo-b1", "trigger.workflow", "Orders imported", {
    triggerType: "manual",
    outputFields: ["batchId", "orders"],
    outputFieldDefs: [
      { name: "batchId", type: "string" },
      { name: "orders", type: "array" },
    ],
  }),
  groupItems: templateNode("demo-b2", "action.aggregate", "Group by status", {
    groupByField: fieldRef("demo-b1", "status"),
    itemsField: fieldRef("demo-b1", "orders"),
  }),
  loop: templateNode("demo-b3", "loop.over-items", "Process each order", {
    collectionField: fieldRef("demo-b1", "orders"),
  }),
  processItem: templateNode("demo-b4", "action.edit-fields", "Normalize order", {
    fieldCount: 2,
    fieldEdits: [
      {
        name: "batchId",
        sourceField: fieldRef("demo-b1", "batchId"),
      },
      {
        name: "orderIndex",
        sourceField: fieldRef("demo-b3", "loopIndex"),
      },
    ],
  }),
  fanOut: templateNode("demo-b5", "parallel.base", "Finalize branches", {
    maxConcurrency: 2,
  }),
  branchAEdit: templateNode("demo-b6", "action.edit-fields", "Summary branch", {
    fieldCount: 1,
    fieldEdits: [
      {
        name: "batchId",
        sourceField: fieldRef("demo-b1", "batchId"),
      },
    ],
  }),
  branchBEdit: templateNode("demo-b7", "action.edit-fields", "Audit branch", {
    fieldCount: 1,
    fieldEdits: [
      {
        name: "loopItemCount",
        sourceField: fieldRef("demo-b3", "loopItemCount"),
      },
    ],
  }),
  merge: templateNode("demo-b8", "action.merge", "Combine branches"),
  finalize: templateNode("demo-b9", "action.edit-fields", "Merged output", {
    fieldCount: 1,
    fieldEdits: [
      {
        name: "batchId",
        sourceField: fieldRef("demo-b1", "batchId"),
      },
    ],
  }),
}

const batchLabGraph = buildGraph(
  [
    batchLabNodes.trigger,
    batchLabNodes.groupItems,
    batchLabNodes.loop,
    batchLabNodes.processItem,
    batchLabNodes.fanOut,
    batchLabNodes.branchAEdit,
    batchLabNodes.branchBEdit,
    batchLabNodes.merge,
    batchLabNodes.finalize,
  ],
  [
    connect(batchLabNodes.trigger.id, batchLabNodes.groupItems.id),
    connect(batchLabNodes.groupItems.id, batchLabNodes.loop.id),
    connect(batchLabNodes.loop.id, batchLabNodes.processItem.id, "loop", "main-in"),
    connect(batchLabNodes.loop.id, batchLabNodes.fanOut.id, "done", "main-in"),
    connect(batchLabNodes.fanOut.id, batchLabNodes.branchAEdit.id, "branch-a", "main-in"),
    connect(batchLabNodes.fanOut.id, batchLabNodes.branchBEdit.id, "branch-b", "main-in"),
    connect(batchLabNodes.branchAEdit.id, batchLabNodes.merge.id, "main-out", "input-a"),
    connect(batchLabNodes.branchBEdit.id, batchLabNodes.merge.id, "main-out", "input-b"),
    connect(batchLabNodes.merge.id, batchLabNodes.finalize.id),
  ]
)

/**
 * Template 3 — Switch predefined rules, wait pause, JSON routing.
 * Test payload: { "leadId": "lead-9", "score": "72", "region": "emea" }
 */
const switchLabNodes = {
  trigger: templateNode("demo-c1", "trigger.workflow", "Lead scored", {
    triggerType: "manual",
    outputFields: ["leadId", "score", "region"],
    outputFieldDefs: [
      { name: "leadId", type: "string" },
      { name: "score", type: "string" },
      { name: "region", type: "string" },
    ],
  }),
  route: templateNode("demo-c2", "condition.switch", "Route by score", {
    caseCount: 2,
    includeDefaultOutput: true,
    switchCases: [
      {
        portId: "case-1",
        label: "Case 1",
        field: fieldRef("demo-c1", "score"),
        operator: "greater_than",
        compareValue: "80",
      },
      {
        portId: "case-2",
        label: "Case 2",
        field: fieldRef("demo-c1", "score"),
        operator: "greater_than",
        compareValue: "50",
      },
      {
        portId: "default",
        label: "Default",
        field: "",
        operator: "equals",
        compareValue: "",
      },
    ],
  }),
  priorityWait: templateNode("demo-c3", "loop.wait", "Priority cool-down", {
    durationMs: 3000,
  }),
  priorityEdit: templateNode("demo-c4", "action.edit-fields", "Priority lead", {
    fieldCount: 2,
    fieldEdits: [
      { name: "leadId", sourceField: fieldRef("demo-c1", "leadId") },
      { name: "tier", sourceField: fieldRef("demo-c1", "score") },
    ],
  }),
  standardEdit: templateNode("demo-c5", "action.edit-fields", "Standard lead", {
    fieldCount: 1,
    fieldEdits: [
      { name: "leadId", sourceField: fieldRef("demo-c1", "leadId") },
    ],
  }),
  nurtureEdit: templateNode("demo-c6", "action.edit-fields", "Nurture lead", {
    fieldCount: 1,
    fieldEdits: [
      { name: "leadId", sourceField: fieldRef("demo-c1", "leadId") },
    ],
  }),
}

const switchLabGraph = buildGraph(
  [
    switchLabNodes.trigger,
    switchLabNodes.route,
    switchLabNodes.priorityWait,
    switchLabNodes.priorityEdit,
    switchLabNodes.standardEdit,
    switchLabNodes.nurtureEdit,
  ],
  [
    connect(switchLabNodes.trigger.id, switchLabNodes.route.id),
    connect(
      switchLabNodes.route.id,
      switchLabNodes.priorityWait.id,
      "case-1",
      "main-in"
    ),
    connect(switchLabNodes.priorityWait.id, switchLabNodes.priorityEdit.id),
    connect(
      switchLabNodes.route.id,
      switchLabNodes.standardEdit.id,
      "case-2",
      "main-in"
    ),
    connect(
      switchLabNodes.route.id,
      switchLabNodes.nurtureEdit.id,
      "default",
      "main-in"
    ),
  ]
)

export const templateCatalog: WorkflowTemplate[] = [
  {
    id: "demo-approval-lab",
    name: "Approval Gateway (Testing Lab)",
    description:
      "JSON trigger fields, multi-field Edit Fields, IF routing, and a manual approval pause. Try amount 1200 to hit approval, or 200 to auto-approve.",
    category: "Testing",
    nodeCount: approvalLabGraph.nodes.length,
    usageCount: 0,
    tags: ["testing", "approval", "if", "edit-fields", "json"],
    source: "provider",
    nodes: approvalLabGraph.nodes,
    edges: approvalLabGraph.edges,
  },
  {
    id: "demo-batch-lab",
    name: "Batch Orders (Testing Lab)",
    description:
      "Array JSON trigger, Group Items, Loop Over Items, parallel branches, and Combine Branches merge. For orders use comma-separated IDs, e.g. ord-1, ord-2.",
    category: "Testing",
    nodeCount: batchLabGraph.nodes.length,
    usageCount: 0,
    tags: ["testing", "loop", "aggregate", "parallel", "merge", "array"],
    source: "provider",
    nodes: batchLabGraph.nodes,
    edges: batchLabGraph.edges,
  },
  {
    id: "demo-switch-lab",
    name: "Switch Router (Testing Lab)",
    description:
      "Predefined Switch case rules (no JavaScript), a Wait pause on the priority path, and typed JSON trigger output. Try score 85, 65, or 30.",
    category: "Testing",
    nodeCount: switchLabGraph.nodes.length,
    usageCount: 0,
    tags: ["testing", "switch", "wait", "edit-fields", "json"],
    source: "provider",
    nodes: switchLabGraph.nodes,
    edges: switchLabGraph.edges,
  },
]

export async function listTemplates(): Promise<WorkflowTemplate[]> {
  return templateCatalog
}
