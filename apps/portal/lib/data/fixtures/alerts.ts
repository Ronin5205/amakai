import type { Alert } from "@/lib/domain/monitoring"

export const alertFixtures: Alert[] = [
  {
    id: "alert-001",
    severity: "critical",
    title: "Support Ticket Triage failure rate spike",
    message:
      "Failure rate exceeded 15% threshold over the last 15 minutes (current: 22%). AI classifier timeouts detected.",
    source: "monitoring-service",
    timestamp: "2026-07-30T10:44:45.000Z",
  },
  {
    id: "alert-002",
    severity: "warning",
    title: "Deployment Engine degraded",
    message:
      "Deployment Engine health check latency above 2s for 3 consecutive checks. Rollback operations may be delayed.",
    source: "health-monitor",
    timestamp: "2026-07-30T10:43:00.000Z",
    acknowledged: true,
  },
  {
    id: "alert-003",
    severity: "warning",
    title: "CRM API rate limit approaching",
    message:
      "Lead Routing workflow consuming 85% of daily CRM enrichment API quota. Consider increasing rate limit or caching.",
    source: "rate-limiter",
    timestamp: "2026-07-30T10:44:58.000Z",
  },
  {
    id: "alert-004",
    severity: "info",
    title: "Scheduled maintenance window",
    message:
      "Analytics Engine database migration scheduled for 2026-07-31 02:00 UTC. Expected downtime: 15 minutes.",
    source: "platform-admin",
    timestamp: "2026-07-30T09:00:00.000Z",
    acknowledged: true,
  },
  {
    id: "alert-005",
    severity: "critical",
    title: "Duplicate invoice processing blocked",
    message:
      "Invoice Processing Pipeline blocked 3 duplicate submissions in the last hour. Review dedup rules for PO-8834 series.",
    source: "validation-engine",
    timestamp: "2026-07-30T10:41:50.000Z",
  },
  {
    id: "alert-006",
    severity: "warning",
    title: "Execution queue depth elevated",
    message:
      "execution-queue depth at 23 jobs (threshold: 20). Consider scaling workers from 12 to 16.",
    source: "queue-monitor",
    timestamp: "2026-07-30T10:40:00.000Z",
  },
]
