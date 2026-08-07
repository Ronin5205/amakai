# Portal data layer

Async accessors in this folder are the **only** place that should know whether data comes from stubs, in-memory catalog data, or Supabase. Pages and view components must not query the database directly.

## Pattern

```ts
// lib/data/executions.ts
import { listProductionRunsForWorkflow } from "@/lib/data/production-runs"

export async function listWorkflowExecutions(workflowId: string) {
  const runs = await listProductionRunsForWorkflow(workflowId)
  return runs.map(mapToWorkflowExecution)
}
```

```tsx
// app/(app)/operate/live-workflows/[workflowId]/executions/page.tsx
import { listWorkflowExecutions } from "@/lib/data/executions"

export default async function Page({ params }) {
  const { workflowId } = await params
  const executions = await listWorkflowExecutions(workflowId)
  return <WorkflowExecutionsView executions={executions} />
}
```

## Modules

| Accessor | Functions | Backend | Domain types |
|----------|-----------|---------|--------------|
| `workflows.ts` | `listWorkflows`, `getWorkflowDraft`, `createWorkflowDraft`, `saveWorkflowDraft`, `deleteWorkflow`, `duplicateWorkflow` | Supabase | `workflow` |
| `workflow-names.ts` | Unique name helpers | — | — |
| `workflow-mappers.ts` | Row ↔ domain mappers | — | `workflow` |
| `data-tables.ts` | CRUD + row listing for design tables | Supabase | `data-table` |
| `data-table-mappers.ts` | Row ↔ domain mappers | — | `data-table` |
| `deployments.ts` | `deployWorkflowDraft`, `listLiveWorkflows`, `getLiveWorkflow` | Supabase | `deployment` |
| `production-runs.ts` | `startProductionRun`, `listProductionRuns`, `listProductionExecutionRecords`, retention prune | Supabase (`workflow_executions`) | `production`, `execution` |
| `executions.ts` | `listExecutions`, `listWorkflowExecutions`, summaries | Via `production-runs` | `execution`, `operate` |
| `logs.ts` | `listExecutionLogGroups`, `listLogs`, `getExecutionLogDetail` | Via `production-runs` | `monitoring`, `operate` |
| `monitoring.ts` | `getWorkflowMonitoring` | Supabase + execution aggregation | `operate`, `monitoring` |
| `templates.ts` | `listTemplates` | In-memory catalog templates | `template` |
| `planning.ts` | `getPlanningStages`, `getSampleAnalysis`, `getClarificationQuestions` | Stubs (empty) | `planning` |
| `secrets.ts` | CRUD, OAuth state, encrypted payloads | Supabase | `secret` |
| `billing.ts` | Billing profile, plan, Stripe customer/subscription sync | Supabase + Stripe | `billing` |
| `trigger-subscriptions.ts` | `syncTriggerSubscriptions`, webhook/email subscription lookup | Supabase | — |
| `schedule-runs.ts` | `fireDueSchedules`, schedule subscription helpers | Supabase | — |
| `inbound-runs.ts` | `enqueueAndProcessInboundRun`, `processQueuedExecution` | Supabase | — |
| `ai-threads.ts` | `listAiThreads`, `getOrCreateAiThread`, `listAiMessages`, `appendAiMessage` | Supabase | `ai` |
| `ai-usage.ts` | `getAiQuotaSnapshot`, `assertAiQuota`, `recordAiUsage` | Supabase | `ai` |

Supporting logic (not accessors):

| Location | Role |
|----------|------|
| `lib/validation/` | Zod schemas and limits for names, tables, workflow node config |
| `lib/stripe/` | Sole Stripe gateway (`gateway.ts`), ID crypto, public exports |
| `lib/operate/production-execution-insights.ts` | Parse run results → logs, monitoring metrics, trigger input |
| `lib/operate/workflow-monitoring-profile.ts` | Adaptive monitoring sections from workflow graph + runs |
| `lib/operate/execution-log-retention.ts` | `PRODUCTION_EXECUTION_RETENTION_LIMIT` (20 runs per workflow) |
| `lib/engine/playground.ts` | In-process validation and production execution engine (scaffold) |
| `lib/ai/` | Assistant models, RAG, tools, quota, graph validation, workspace sync |

## Supabase tables

Apply migrations in `supabase/migrations/` (oldest first):

| Migration | Tables / changes |
|-----------|------------------|
| `20260730183000_workflows_and_deploy.sql` | `workflows`, `workflow_versions`, `environments`, `releases` |
| `20260731190000_data_tables.sql` | Design-time data tables |
| `20260731200000_data_tables_unique_name.sql` | Unique table names per user |
| `20260802150000_workflow_executions.sql` | Production run history |
| `20260802153000_workflow_executions_delete_policy.sql` | Delete policy for retention pruning |
| `20260803190000_secrets_and_triggers.sql` | Secrets vault, OAuth states, trigger subscriptions |
| `20260804200000_user_billing_profiles.sql` | Billing plan + Stripe customer linkage |
| `20260804210000_billing_stripe_customers.sql` | Drop local address columns; add Stripe ids |
| `20260804220000_billing_security_hardening.sql` | Webhook idempotency; encrypted Stripe refs; read-only RLS |
| `20260804230000_billing_cancel_at_period_end.sql` | Cancel-at-period-end + period end for subscription UI |
| `20260807160000_ai_pgvector.sql` | `vector` extension (pgvector) |
| `20260807160100_ai_knowledge_and_workspace.sql` | `ai_knowledge_chunks`, `ai_workspace_chunks`, cosine search RPCs |
| `20260807160200_ai_threads_and_messages.sql` | `ai_threads`, `ai_messages` |
| `20260807160300_ai_usage.sql` | Usage ledger, monthly rollup, increment RPC |
| `20260807170000_ai_threads_auto_mode.sql` | Collapse thread `mode` to `auto` |

## Production execution flow

1. User deploys from the workflow editor (`deployWorkflowDraft`) → workflow status `published`, version `live`, trigger subscriptions synced (webhook token, schedule metadata, Gmail/Outlook watches).
2. A run starts from:
   - **Production → Runs** (`startProductionRun`) with optional trigger payload, or
   - **Inbound triggers:** `POST /api/webhooks/{token}`, email push routes, or schedule tick via `POST /api/internal/process-queue` → `enqueueAndProcessInboundRun` / `fireDueSchedules`.
3. Run is stored in `workflow_executions` with `result` JSON (steps, trigger input, optional `pendingApproval` / `pendingWait`).
4. **Operate → Logs**, **Live Workflows → Executions/Monitoring**, and **Production → History** read from the same table.
5. After each run, executions older than the last **20 per workflow** are deleted.

Inbound webhook/email routes are **session-public** (see `utils/supabase/middleware.ts`); auth is per-route (webhook token, HMAC, provider push verification).

Schedule triggers require an external cron calling `POST /api/internal/process-queue` every minute when `CRON_SECRET` is set.

## Swapping or extending backends

Keep exported function signatures and domain types stable. Map snake_case DB rows to camelCase domain objects inside accessors.

Use `@/utils/supabase/server` in Server Components and Server Actions. Use `@/utils/supabase/client` only in Client Components.

## Rules for agents

1. **Do not** fetch inside `components/views/*` — pass props from pages.
2. **Do not** change view prop types unless the domain model changes.
3. **Do** add migrations and RLS before exposing new tables.
4. **Do** scope RLS with `auth.uid()` on user-owned rows (current model is single-user; org tenancy is future work).
5. Wire mutations via Server Actions in `lib/actions/` and revalidate affected routes.

See [Portal_Guide.md](../../../docs/Portal_Guide.md) for routes and UX, and [SDLC.md](../../../docs/SDLC.md) for product requirements.
