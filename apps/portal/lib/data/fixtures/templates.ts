import type { WorkflowTemplate } from "@/lib/domain/template"

export const templateFixtures: WorkflowTemplate[] = [
  {
    id: "tpl-001",
    name: "Invoice Processing",
    description:
      "Extract, validate, and route invoices from email attachments through approval and ERP posting",
    category: "Finance",
    nodeCount: 12,
    usageCount: 847,
    tags: ["finance", "ocr", "approval", "erp"],
  },
  {
    id: "tpl-002",
    name: "Lead Routing & Qualification",
    description:
      "Enrich inbound leads from multiple sources, score with AI, and route to the appropriate sales rep",
    category: "Sales",
    nodeCount: 9,
    usageCount: 1234,
    tags: ["crm", "sales", "enrichment", "routing"],
  },
  {
    id: "tpl-003",
    name: "Customer Onboarding",
    description:
      "Provision accounts, send welcome sequences, and set up integrations for new customers",
    category: "Customer Success",
    nodeCount: 15,
    usageCount: 562,
    tags: ["onboarding", "provisioning", "email"],
  },
  {
    id: "tpl-004",
    name: "Support Ticket Triage",
    description:
      "Classify incoming support tickets by priority and category, assign to the right team",
    category: "Support",
    nodeCount: 8,
    usageCount: 2103,
    tags: ["support", "ai-classification", "zendesk"],
  },
  {
    id: "tpl-005",
    name: "Expense Report Approval",
    description:
      "Validate expense submissions against policy rules and route through multi-level approval",
    category: "Finance",
    nodeCount: 10,
    usageCount: 389,
    tags: ["finance", "approval", "compliance"],
  },
  {
    id: "tpl-006",
    name: "Contract Renewal Reminder",
    description:
      "Monitor contract expiration dates and send automated renewal reminders to account owners",
    category: "Legal",
    nodeCount: 6,
    usageCount: 278,
    tags: ["legal", "scheduled", "notifications"],
  },
  {
    id: "tpl-007",
    name: "Inventory Reorder Alert",
    description:
      "Track stock levels across warehouses and trigger purchase orders when thresholds are breached",
    category: "Operations",
    nodeCount: 7,
    usageCount: 156,
    tags: ["inventory", "threshold", "procurement"],
  },
]
