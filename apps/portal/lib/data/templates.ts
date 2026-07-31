import type { WorkflowTemplate } from "@/lib/domain/template"
import type { NodeConfig, WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import { getComponentCatalogItemById } from "@/lib/design/component-catalog"
import { createNodeFromCatalogItem } from "@/lib/design/node-utils"
import { buildDefaultSwitchCases } from "@/lib/design/upstream-fields"
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

function chainMain(nodes: WorkflowNode[]): WorkflowEdge[] {
  return nodes.slice(0, -1).map((node, index) =>
    connect(node.id, nodes[index + 1].id)
  )
}

function buildGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
  return { nodes, edges }
}

const invoiceNodes = {
  trigger: templateNode("tmpl-inv-1", "trigger.workflow", "Invoice received", {
    triggerType: "webhook",
    outputFields: ["invoiceId", "amount", "vendor", "dueDate"],
  }),
  normalize: templateNode("tmpl-inv-2", "action.edit-fields", "Normalize fields", {
    fieldEdits: [
      { name: "invoiceId", sourceField: fieldRef("tmpl-inv-1", "invoiceId") },
      { name: "amount", sourceField: fieldRef("tmpl-inv-1", "amount") },
      { name: "vendor", sourceField: fieldRef("tmpl-inv-1", "vendor") },
      { name: "dueDate", sourceField: fieldRef("tmpl-inv-1", "dueDate") },
    ],
  }),
  reviewGate: templateNode("tmpl-inv-3", "condition.if", "Needs approval?", {
    field: fieldRef("tmpl-inv-1", "amount"),
    operator: "greater_than",
    compareValue: "1000",
  }),
  approval: templateNode("tmpl-inv-4", "approval.base", "Manager approval", {
    approverEmail: "manager@company.com",
  }),
  approvedStore: templateNode(
    "tmpl-inv-5",
    "action.data-table",
    "Save approved invoice",
    {
      operation: "write",
      tableName: "approved_invoices",
    }
  ),
  autoStore: templateNode(
    "tmpl-inv-6",
    "action.data-table",
    "Auto-save small invoice",
    {
      operation: "write",
      tableName: "auto_approved_invoices",
    }
  ),
}

const invoiceGraph = buildGraph(
  [
    invoiceNodes.trigger,
    invoiceNodes.normalize,
    invoiceNodes.reviewGate,
    invoiceNodes.approval,
    invoiceNodes.approvedStore,
    invoiceNodes.autoStore,
  ],
  [
    connect(invoiceNodes.trigger.id, invoiceNodes.normalize.id),
    connect(invoiceNodes.normalize.id, invoiceNodes.reviewGate.id),
    connect(
      invoiceNodes.reviewGate.id,
      invoiceNodes.approval.id,
      "true",
      "main-in"
    ),
    connect(invoiceNodes.approval.id, invoiceNodes.approvedStore.id),
    connect(
      invoiceNodes.reviewGate.id,
      invoiceNodes.autoStore.id,
      "false",
      "main-in"
    ),
  ]
)

const leadNodes = {
  trigger: templateNode("tmpl-lead-1", "trigger.workflow", "Lead submitted", {
    triggerType: "webhook",
    outputFields: ["email", "company", "score", "source"],
  }),
  enrich: templateNode("tmpl-lead-2", "action.code", "Enrich lead", {
    language: "javascript",
    code: "// Enrich lead data from the incoming JSON payload\nreturn items;",
  }),
  route: templateNode("tmpl-lead-3", "condition.switch", "Route by score", {
    caseCount: 2,
    includeDefaultOutput: true,
    switchCases: buildDefaultSwitchCases(2, true).map((rule, index) => ({
      ...rule,
      condition:
        index === 0
          ? "score is high priority"
          : index === 1
            ? "score is standard"
            : "all other leads",
    })),
  }),
  sort: templateNode("tmpl-lead-4", "action.sort", "Sort priority leads", {
    sortField: fieldRef("tmpl-lead-1", "score"),
    direction: "desc",
  }),
  priorityStore: templateNode(
    "tmpl-lead-5",
    "action.data-table",
    "Save priority lead",
    {
      operation: "write",
      tableName: "priority_leads",
    }
  ),
  standardStore: templateNode(
    "tmpl-lead-6",
    "action.data-table",
    "Save standard lead",
    {
      operation: "write",
      tableName: "standard_leads",
    }
  ),
  nurtureStore: templateNode(
    "tmpl-lead-7",
    "action.data-table",
    "Queue nurture lead",
    {
      operation: "write",
      tableName: "nurture_leads",
    }
  ),
}

const leadGraph = buildGraph(
  [
    leadNodes.trigger,
    leadNodes.enrich,
    leadNodes.route,
    leadNodes.sort,
    leadNodes.priorityStore,
    leadNodes.standardStore,
    leadNodes.nurtureStore,
  ],
  [
    ...chainMain([leadNodes.trigger, leadNodes.enrich, leadNodes.route]),
    connect(leadNodes.route.id, leadNodes.sort.id, "case-1", "main-in"),
    connect(leadNodes.sort.id, leadNodes.priorityStore.id),
    connect(leadNodes.route.id, leadNodes.standardStore.id, "case-2", "main-in"),
    connect(leadNodes.route.id, leadNodes.nurtureStore.id, "default", "main-in"),
  ]
)

const supportNodes = {
  trigger: templateNode("tmpl-sup-1", "trigger.workflow", "Ticket opened", {
    triggerType: "webhook",
    outputFields: ["ticketId", "subject", "body", "priority"],
  }),
  classify: templateNode("tmpl-sup-2", "action.code", "Classify ticket", {
    language: "javascript",
    code: "// Classify the ticket from incoming JSON\nreturn items;",
  }),
  priorityGate: templateNode("tmpl-sup-3", "condition.if", "Is urgent?", {
    field: fieldRef("tmpl-sup-1", "priority"),
    operator: "equals",
    compareValue: "high",
  }),
  urgentFilter: templateNode("tmpl-sup-4", "condition.filter", "Confirm urgent", {
    field: fieldRef("tmpl-sup-1", "priority"),
    operator: "equals",
    compareValue: "high",
  }),
  urgentStore: templateNode(
    "tmpl-sup-5",
    "action.data-table",
    "Urgent assignment queue",
    {
      operation: "write",
      tableName: "urgent_tickets",
    }
  ),
  standardStore: templateNode(
    "tmpl-sup-6",
    "action.data-table",
    "Standard assignment queue",
    {
      operation: "write",
      tableName: "standard_tickets",
    }
  ),
}

const supportGraph = buildGraph(
  [
    supportNodes.trigger,
    supportNodes.classify,
    supportNodes.priorityGate,
    supportNodes.urgentFilter,
    supportNodes.urgentStore,
    supportNodes.standardStore,
  ],
  [
    connect(supportNodes.trigger.id, supportNodes.classify.id),
    connect(supportNodes.classify.id, supportNodes.priorityGate.id),
    connect(
      supportNodes.priorityGate.id,
      supportNodes.urgentFilter.id,
      "true",
      "main-in"
    ),
    connect(supportNodes.urgentFilter.id, supportNodes.urgentStore.id),
    connect(
      supportNodes.priorityGate.id,
      supportNodes.standardStore.id,
      "false",
      "main-in"
    ),
  ]
)

const batchNodes = {
  trigger: templateNode("tmpl-batch-1", "trigger.workflow", "Orders imported", {
    triggerType: "schedule",
    outputFields: ["batchId", "orders"],
  }),
  loop: templateNode("tmpl-batch-2", "loop.over-items", "Process each order", {
    collectionField: fieldRef("tmpl-batch-1", "orders"),
  }),
  processItem: templateNode("tmpl-batch-3", "action.edit-fields", "Normalize order", {
    fieldEdits: [
      { name: "batchId", sourceField: fieldRef("tmpl-batch-1", "batchId") },
    ],
  }),
  itemStore: templateNode("tmpl-batch-4", "action.data-table", "Save each order", {
    operation: "write",
    tableName: "processed_orders",
  }),
  summarize: templateNode("tmpl-batch-5", "action.summarize", "Summarize batch", {
    valueField: fieldRef("tmpl-batch-1", "orders"),
    metric: "count",
  }),
  summaryStore: templateNode(
    "tmpl-batch-6",
    "action.data-table",
    "Persist batch summary",
    {
      operation: "write",
      tableName: "order_batches",
    }
  ),
}

const batchGraph = buildGraph(
  [
    batchNodes.trigger,
    batchNodes.loop,
    batchNodes.processItem,
    batchNodes.itemStore,
    batchNodes.summarize,
    batchNodes.summaryStore,
  ],
  [
    connect(batchNodes.trigger.id, batchNodes.loop.id),
    connect(batchNodes.loop.id, batchNodes.processItem.id, "loop", "main-in"),
    connect(batchNodes.processItem.id, batchNodes.itemStore.id),
    connect(batchNodes.loop.id, batchNodes.summarize.id, "done", "main-in"),
    connect(batchNodes.summarize.id, batchNodes.summaryStore.id),
  ]
)

const normalizeNodes = {
  trigger: templateNode("tmpl-norm-1", "trigger.workflow", "Contact sync", {
    triggerType: "manual",
    outputFields: ["firstName", "lastName", "email", "createdAt"],
  }),
  rename: templateNode("tmpl-norm-2", "action.rename-keys", "Standardize keys", {
    renames: [
      {
        fromField: fieldRef("tmpl-norm-1", "firstName"),
        toField: "givenName",
      },
      {
        fromField: fieldRef("tmpl-norm-1", "lastName"),
        toField: "familyName",
      },
    ],
  }),
  sort: templateNode("tmpl-norm-3", "action.sort", "Sort by created date", {
    sortField: fieldRef("tmpl-norm-1", "createdAt"),
    direction: "asc",
  }),
  segmentGate: templateNode("tmpl-norm-4", "condition.if", "Work email?", {
    field: fieldRef("tmpl-norm-1", "email"),
    operator: "contains",
    compareValue: "@company.com",
  }),
  enterpriseAggregate: templateNode(
    "tmpl-norm-5",
    "action.aggregate",
    "Group work contacts",
    {
      groupByField: fieldRef("tmpl-norm-1", "email"),
    }
  ),
  consumerAggregate: templateNode(
    "tmpl-norm-6",
    "action.aggregate",
    "Group personal contacts",
    {
      groupByField: fieldRef("tmpl-norm-1", "email"),
    }
  ),
  enterpriseStore: templateNode(
    "tmpl-norm-7",
    "action.data-table",
    "Store work contacts",
    {
      operation: "write",
      tableName: "work_contacts",
    }
  ),
  consumerStore: templateNode(
    "tmpl-norm-8",
    "action.data-table",
    "Store personal contacts",
    {
      operation: "write",
      tableName: "personal_contacts",
    }
  ),
}

const normalizeGraph = buildGraph(
  [
    normalizeNodes.trigger,
    normalizeNodes.rename,
    normalizeNodes.sort,
    normalizeNodes.segmentGate,
    normalizeNodes.enterpriseAggregate,
    normalizeNodes.consumerAggregate,
    normalizeNodes.enterpriseStore,
    normalizeNodes.consumerStore,
  ],
  [
    ...chainMain([
      normalizeNodes.trigger,
      normalizeNodes.rename,
      normalizeNodes.sort,
      normalizeNodes.segmentGate,
    ]),
    connect(
      normalizeNodes.segmentGate.id,
      normalizeNodes.enterpriseAggregate.id,
      "true",
      "main-in"
    ),
    connect(normalizeNodes.enterpriseAggregate.id, normalizeNodes.enterpriseStore.id),
    connect(
      normalizeNodes.segmentGate.id,
      normalizeNodes.consumerAggregate.id,
      "false",
      "main-in"
    ),
    connect(normalizeNodes.consumerAggregate.id, normalizeNodes.consumerStore.id),
  ]
)

const parallelNodes = {
  trigger: templateNode("tmpl-par-1", "trigger.workflow", "New signup", {
    triggerType: "webhook",
    outputFields: ["userId", "email", "plan"],
  }),
  fanOut: templateNode("tmpl-par-2", "parallel.base", "Run onboarding tasks", {
    maxConcurrency: 3,
  }),
  welcomeEdit: templateNode("tmpl-par-3", "action.edit-fields", "Prepare welcome", {
    fieldEdits: [
      { name: "userId", sourceField: fieldRef("tmpl-par-1", "userId") },
      { name: "email", sourceField: fieldRef("tmpl-par-1", "email") },
    ],
  }),
  analyticsStore: templateNode(
    "tmpl-par-4",
    "action.data-table",
    "Track signup event",
    {
      operation: "write",
      tableName: "signup_events",
    }
  ),
  provisionStore: templateNode(
    "tmpl-par-5",
    "action.data-table",
    "Provision account",
    {
      operation: "write",
      tableName: "provisioned_accounts",
    }
  ),
  merge: templateNode("tmpl-par-6", "action.merge", "Combine onboarding results"),
  finalStore: templateNode("tmpl-par-7", "action.data-table", "Complete onboarding", {
    operation: "write",
    tableName: "onboarded_users",
  }),
}

const parallelGraph = buildGraph(
  [
    parallelNodes.trigger,
    parallelNodes.fanOut,
    parallelNodes.welcomeEdit,
    parallelNodes.analyticsStore,
    parallelNodes.provisionStore,
    parallelNodes.merge,
    parallelNodes.finalStore,
  ],
  [
    connect(parallelNodes.trigger.id, parallelNodes.fanOut.id),
    connect(parallelNodes.fanOut.id, parallelNodes.welcomeEdit.id, "branch-a", "main-in"),
    connect(parallelNodes.welcomeEdit.id, parallelNodes.analyticsStore.id),
    connect(
      parallelNodes.fanOut.id,
      parallelNodes.provisionStore.id,
      "branch-b",
      "main-in"
    ),
    connect(parallelNodes.analyticsStore.id, parallelNodes.merge.id, "main-out", "input-a"),
    connect(parallelNodes.provisionStore.id, parallelNodes.merge.id, "main-out", "input-b"),
    connect(parallelNodes.merge.id, parallelNodes.finalStore.id),
  ]
)

const waitAndStopNodes = {
  trigger: templateNode("tmpl-wait-1", "trigger.workflow", "Manual review", {
    triggerType: "manual",
    outputFields: ["requestId", "status"],
  }),
  wait: templateNode("tmpl-wait-2", "loop.wait", "Cool-down period", {
    durationMs: 3000,
  }),
  check: templateNode("tmpl-wait-3", "condition.if", "Approved?", {
    field: fieldRef("tmpl-wait-1", "status"),
    operator: "equals",
    compareValue: "approved",
  }),
  approvedStore: templateNode(
    "tmpl-wait-4",
    "action.data-table",
    "Record approval",
    {
      operation: "write",
      tableName: "approved_requests",
    }
  ),
  stop: templateNode("tmpl-wait-5", "exception.stop-and-error", "Reject request", {
    errorMessage: "Request was not approved",
  }),
}

const waitAndStopGraph = buildGraph(
  [
    waitAndStopNodes.trigger,
    waitAndStopNodes.wait,
    waitAndStopNodes.check,
    waitAndStopNodes.approvedStore,
    waitAndStopNodes.stop,
  ],
  [
    ...chainMain([
      waitAndStopNodes.trigger,
      waitAndStopNodes.wait,
      waitAndStopNodes.check,
    ]),
    connect(
      waitAndStopNodes.check.id,
      waitAndStopNodes.approvedStore.id,
      "true",
      "main-in"
    ),
    connect(
      waitAndStopNodes.check.id,
      waitAndStopNodes.stop.id,
      "false",
      "main-in"
    ),
  ]
)

export const templateCatalog: WorkflowTemplate[] = [
  {
    id: "tmpl-invoice",
    name: "Invoice Processing",
    description:
      "Route high amounts through approval, auto-save smaller invoices on the false branch.",
    category: "Finance",
    nodeCount: invoiceGraph.nodes.length,
    usageCount: 1240,
    tags: ["finance", "if", "approvals"],
    source: "provider",
    nodes: invoiceGraph.nodes,
    edges: invoiceGraph.edges,
  },
  {
    id: "tmpl-leads",
    name: "Lead Routing",
    description:
      "Switch across three outputs — priority, standard, and nurture paths.",
    category: "Sales",
    nodeCount: leadGraph.nodes.length,
    usageCount: 890,
    tags: ["sales", "switch", "routing"],
    source: "community",
    nodes: leadGraph.nodes,
    edges: leadGraph.edges,
  },
  {
    id: "tmpl-support",
    name: "Support Ticket Triage",
    description:
      "Split urgent and standard tickets using IF true/false outputs.",
    category: "Support",
    nodeCount: supportGraph.nodes.length,
    usageCount: 2100,
    tags: ["support", "if", "filter"],
    source: "provider",
    nodes: supportGraph.nodes,
    edges: supportGraph.edges,
  },
  {
    id: "tmpl-batch-orders",
    name: "Batch Order Summary",
    description:
      "Use Loop and Done outputs — process each item, then summarize the batch.",
    category: "Operations",
    nodeCount: batchGraph.nodes.length,
    usageCount: 420,
    tags: ["loop", "summarize", "operations"],
    source: "provider",
    nodes: batchGraph.nodes,
    edges: batchGraph.edges,
  },
  {
    id: "tmpl-data-normalization",
    name: "Data Normalization",
    description:
      "Segment contacts on IF true/false, then aggregate and store separately.",
    category: "Data",
    nodeCount: normalizeGraph.nodes.length,
    usageCount: 650,
    tags: ["if", "aggregate", "rename"],
    source: "community",
    nodes: normalizeGraph.nodes,
    edges: normalizeGraph.edges,
  },
  {
    id: "tmpl-parallel-onboarding",
    name: "Parallel Onboarding",
    description:
      "Fan out across parallel branches, then merge results before completing.",
    category: "Operations",
    nodeCount: parallelGraph.nodes.length,
    usageCount: 280,
    tags: ["parallel", "merge", "onboarding"],
    source: "provider",
    nodes: parallelGraph.nodes,
    edges: parallelGraph.edges,
  },
  {
    id: "tmpl-wait-gate",
    name: "Wait and Gate",
    description:
      "Pause, then route approved requests to storage or rejection on IF outputs.",
    category: "Operations",
    nodeCount: waitAndStopGraph.nodes.length,
    usageCount: 310,
    tags: ["wait", "if", "exception"],
    source: "provider",
    nodes: waitAndStopGraph.nodes,
    edges: waitAndStopGraph.edges,
  },
]

export async function listTemplates(): Promise<WorkflowTemplate[]> {
  return templateCatalog
}
