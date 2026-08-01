# Portal data layer

Async accessors in this folder are the **only** place that should know whether data comes from fixtures or Supabase. Pages and view components must not import from `fixtures/` directly.

## Pattern

```ts
// lib/data/executions.ts
import type { Execution } from "@/lib/domain/execution"
import { executionFixtures } from "./fixtures/executions"

export async function listExecutions(): Promise<Execution[]> {
  return executionFixtures // ← replace this body with a Supabase query
}
```

```tsx
// app/(app)/operate/executions/page.tsx
import { listExecutions } from "@/lib/data/executions"

export default async function Page() {
  const executions = await listExecutions()
  return <ExecutionsView executions={executions} />
}
```

## Modules

| Accessor | Functions | Domain types |
|----------|-----------|--------------|
| `dashboard.ts` | `getLiveWorkflowCounts`, `getPerformanceMetrics`, `getAiUsage` | `execution`, `monitoring` |
| `executions.ts` | `listExecutions`, `getExecutionSummary` | `execution` |
| `monitoring.ts` | `getResourceMetrics`, `getComponentHealth`, `getQueueStats`, `getLatencyMetrics` | `monitoring` |
| `logs.ts` | `listLogs` | `monitoring` |
| `alerts.ts` | `listAlerts` | `monitoring` |
| `deployments.ts` | `listEnvironments`, `listVersions`, `listReleases` | `deployment` |
| `templates.ts` | `listTemplates` | `template` |
| `workflows.ts` | `listWorkflows`, `getWorkflowDraft`, `createWorkflowDraft`, `saveWorkflowDraft`, `deleteWorkflow` | `workflow` |
| `planning.ts` | `getPlanningStages`, `getSampleAnalysis`, `getClarificationQuestions` | `planning` |

Fixtures mirror the shape of `lib/domain/*`. When wiring Supabase, keep domain types as the contract and map DB rows to them inside the accessor.

**Workflows** (`workflows.ts`) are partially live: list/get/create/save/delete use Supabase when authenticated. Templates, planning, and deploy environments still use fixtures until those tables are wired.

## Swapping to Supabase (example)

```ts
import { createClient } from "@/utils/supabase/server"
import type { Execution } from "@/lib/domain/execution"

export async function listExecutions(): Promise<Execution[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("executions")
    .select("*")
    .order("started_at", { ascending: false })

  if (error) throw error
  return data.map(mapExecutionRow) // map snake_case rows → domain type
}
```

Use the server client (`@/utils/supabase/server`) in Server Components and Route Handlers. Use `@/utils/supabase/client` only in Client Components.

## Rules for agents

1. **Do not** fetch inside `components/views/*` — keep views presentational; pass props from the page.
2. **Do not** change view prop types when adding a backend unless the domain model changes.
3. **Do** add migrations and RLS in Supabase before exposing new tables to the Data API.
4. **Do** enable RLS on every exposed table; scope rows by `organization_id` (see root `README.md`).
5. Client-side filters (executions, logs, alerts) can move to SQL `where` clauses later without UI changes.
6. Action buttons in views are intentionally disabled until mutations exist — wire Server Actions or API routes in the accessor layer, not in views.

See [SDLC.md](../../../SDLC.md) section 3 (Requirements Engineering) for the domain model this UI implements.
