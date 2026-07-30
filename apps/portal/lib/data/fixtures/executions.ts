import type { Execution, ExecutionSummary } from "@/lib/domain/execution"

export const executionFixtures: Execution[] = [
  {
    id: "exec-001",
    workflowName: "Invoice Processing Pipeline",
    status: "running",
    startedAt: "2026-07-30T10:42:18.000Z",
    durationMs: 12400,
    trigger: "webhook",
    environment: "production",
  },
  {
    id: "exec-002",
    workflowName: "Lead Routing & Qualification",
    status: "queued",
    startedAt: "2026-07-30T10:44:02.000Z",
    trigger: "crm-event",
    environment: "production",
  },
  {
    id: "exec-003",
    workflowName: "Customer Onboarding Sequence",
    status: "completed",
    startedAt: "2026-07-30T10:38:55.000Z",
    durationMs: 45200,
    trigger: "form-submission",
    environment: "staging",
  },
  {
    id: "exec-004",
    workflowName: "Support Ticket Triage",
    status: "failed",
    startedAt: "2026-07-30T10:35:11.000Z",
    durationMs: 8100,
    trigger: "zendesk-webhook",
    environment: "production",
  },
  {
    id: "exec-005",
    workflowName: "Expense Report Approval",
    status: "pending_approval",
    startedAt: "2026-07-30T10:40:33.000Z",
    durationMs: 18600,
    trigger: "scheduled",
    environment: "production",
  },
  {
    id: "exec-006",
    workflowName: "Contract Renewal Reminder",
    status: "completed",
    startedAt: "2026-07-30T10:30:00.000Z",
    durationMs: 3200,
    trigger: "cron",
    environment: "production",
  },
  {
    id: "exec-007",
    workflowName: "Inventory Reorder Alert",
    status: "running",
    startedAt: "2026-07-30T10:43:47.000Z",
    durationMs: 5600,
    trigger: "threshold-event",
    environment: "staging",
  },
]

export const executionSummaryFixture: ExecutionSummary = {
  running: 2,
  queued: 1,
  completed: 142,
  failed: 3,
  pendingApproval: 1,
}
