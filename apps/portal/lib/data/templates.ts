import type { WorkflowTemplate } from "@/lib/domain/template"
import type { WorkflowNode } from "@/lib/domain/workflow"
import { createNodeFromKind } from "@/lib/design/node-utils"
import { buildSequentialEdges } from "@/lib/design/workflow-graph"

function templateNode(
  id: string,
  kind: Parameters<typeof createNodeFromKind>[0],
  label: string
): WorkflowNode {
  return { ...createNodeFromKind(kind, label), id }
}

function templateGraph(nodes: WorkflowNode[]) {
  return { nodes, edges: buildSequentialEdges(nodes) }
}

const invoiceGraph = templateGraph([
  templateNode("tmpl-inv-1", "trigger", "Email trigger"),
  templateNode("tmpl-inv-2", "sequential", "Extract invoice data"),
  templateNode("tmpl-inv-3", "conditional", "Validate and deduplicate"),
  templateNode("tmpl-inv-4", "approval", "Manager approval"),
  templateNode("tmpl-inv-5", "sequential", "Post to ERP"),
])

const leadGraph = templateGraph([
  templateNode("tmpl-lead-1", "trigger", "CRM event trigger"),
  templateNode("tmpl-lead-2", "parallel", "Enrich lead data"),
  templateNode("tmpl-lead-3", "sequential", "Score lead"),
  templateNode("tmpl-lead-4", "conditional", "Route to sales rep"),
])

const supportGraph = templateGraph([
  templateNode("tmpl-sup-1", "trigger", "Ticket webhook"),
  templateNode("tmpl-sup-2", "sequential", "Classify and prioritize"),
  templateNode("tmpl-sup-3", "conditional", "Assign team"),
  templateNode("tmpl-sup-4", "exception", "Handle classification error"),
])

export const templateCatalog: WorkflowTemplate[] = [
  {
    id: "tmpl-invoice",
    name: "Invoice Processing",
    description: "Extract, validate, approve, and post invoices to your ERP.",
    category: "Finance",
    nodeCount: invoiceGraph.nodes.length,
    usageCount: 1240,
    tags: ["finance", "approvals", "erp"],
    source: "provider",
    nodes: invoiceGraph.nodes,
    edges: invoiceGraph.edges,
  },
  {
    id: "tmpl-leads",
    name: "Lead Routing",
    description: "Enrich inbound leads, score fit, and route to the right rep.",
    category: "Sales",
    nodeCount: leadGraph.nodes.length,
    usageCount: 890,
    tags: ["sales", "crm", "routing"],
    source: "community",
    nodes: leadGraph.nodes,
    edges: leadGraph.edges,
  },
  {
    id: "tmpl-support",
    name: "Support Ticket Triage",
    description: "Classify tickets, set priority, and assign to the correct team.",
    category: "Support",
    nodeCount: supportGraph.nodes.length,
    usageCount: 2100,
    tags: ["support", "ai", "triage"],
    source: "provider",
    nodes: supportGraph.nodes,
    edges: supportGraph.edges,
  },
]

export async function listTemplates(): Promise<WorkflowTemplate[]> {
  return templateCatalog
}
