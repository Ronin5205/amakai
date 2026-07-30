import type { Workflow } from "@/lib/domain/workflow"

export const workflowFixtures: Workflow[] = [
  {
    id: "wf-001",
    name: "Invoice Processing Pipeline",
    updatedAt: "2026-07-29T14:22:00.000Z",
    nodes: [
      {
        id: "n1",
        label: "Email Trigger",
        kind: "trigger",
        config: { apiEndpoint: "/webhooks/invoice-inbox" },
      },
      {
        id: "n2",
        label: "Extract Invoice Data",
        kind: "sequential",
        config: {
          aiModel: "gpt-4o",
          promptTemplate: "Extract vendor, amount, PO number, and line items from invoice",
          timeoutMs: 30000,
        },
      },
      {
        id: "n3",
        label: "Validate & Dedup",
        kind: "conditional",
        config: { retryCount: 2 },
      },
      {
        id: "n4",
        label: "Manager Approval",
        kind: "approval",
        config: { timeoutMs: 86400000 },
      },
      {
        id: "n5",
        label: "Post to ERP",
        kind: "sequential",
        config: {
          apiEndpoint: "https://erp.acme.io/api/invoices",
          authMethod: "oauth2",
          outputMapping: { invoiceId: "erp_invoice_id" },
        },
      },
    ],
  },
  {
    id: "wf-002",
    name: "Lead Routing & Qualification",
    updatedAt: "2026-07-28T09:15:00.000Z",
    nodes: [
      {
        id: "n1",
        label: "CRM Event Trigger",
        kind: "trigger",
        config: { apiEndpoint: "/webhooks/crm-lead-created" },
      },
      {
        id: "n2",
        label: "Parallel Enrichment",
        kind: "parallel",
        config: { rateLimit: 100 },
      },
      {
        id: "n3",
        label: "AI Lead Scoring",
        kind: "sequential",
        config: {
          aiModel: "gpt-4o-mini",
          promptTemplate: "Score lead fit based on company size, industry, and engagement signals",
        },
      },
      {
        id: "n4",
        label: "Route to Sales Rep",
        kind: "conditional",
        config: {
          inputMapping: { score: "lead_score", territory: "region" },
        },
      },
    ],
  },
  {
    id: "wf-003",
    name: "Support Ticket Triage",
    updatedAt: "2026-07-25T16:40:00.000Z",
    nodes: [
      {
        id: "n1",
        label: "Zendesk Webhook",
        kind: "trigger",
        config: { apiEndpoint: "/webhooks/zendesk-ticket" },
      },
      {
        id: "n2",
        label: "Classify & Prioritize",
        kind: "sequential",
        config: {
          aiModel: "gpt-4o",
          promptTemplate: "Classify ticket category and assign priority (P1-P4)",
          retryCount: 3,
          timeoutMs: 30000,
        },
      },
      {
        id: "n3",
        label: "Assign Team",
        kind: "conditional",
        config: {},
      },
      {
        id: "n4",
        label: "Handle Classification Error",
        kind: "exception",
        config: { retryCount: 1 },
      },
    ],
  },
  {
    id: "wf-004",
    name: "Customer Onboarding Sequence",
    updatedAt: "2026-07-22T11:00:00.000Z",
    nodes: [
      {
        id: "n1",
        label: "Form Submission Trigger",
        kind: "trigger",
        config: {},
      },
      {
        id: "n2",
        label: "Provision Workspace",
        kind: "sequential",
        config: {
          apiEndpoint: "https://api.acme.io/provision",
          authMethod: "api-key",
          timeoutMs: 60000,
        },
      },
      {
        id: "n3",
        label: "Send Welcome Emails",
        kind: "loop",
        config: { inputMapping: { recipients: "stakeholder_list" } },
      },
    ],
  },
]

export const workflowDraftFixture: Workflow = {
  id: "wf-draft-001",
  name: "Expense Report Approval (Draft)",
  updatedAt: "2026-07-30T10:30:00.000Z",
  nodes: [
    {
      id: "n1",
      label: "Scheduled Trigger",
      kind: "trigger",
      config: { apiEndpoint: "/cron/expense-daily" },
    },
    {
      id: "n2",
      label: "Fetch Pending Reports",
      kind: "sequential",
      config: {
        apiEndpoint: "https://expenses.acme.io/api/reports?status=pending",
        authMethod: "oauth2",
      },
    },
    {
      id: "n3",
      label: "Policy Validation",
      kind: "conditional",
      config: {
        aiModel: "gpt-4o-mini",
        promptTemplate: "Validate expense against company policy rules",
      },
    },
    {
      id: "n4",
      label: "Manager Approval Gate",
      kind: "approval",
      config: { timeoutMs: 172800000 },
    },
    {
      id: "n5",
      label: "Finance Review (>$5000)",
      kind: "conditional",
      config: { inputMapping: { amount: "total_amount" } },
    },
    {
      id: "n6",
      label: "Process Reimbursement",
      kind: "sequential",
      config: {
        apiEndpoint: "https://payroll.acme.io/api/reimburse",
        authMethod: "oauth2",
        retryCount: 2,
      },
    },
  ],
}
