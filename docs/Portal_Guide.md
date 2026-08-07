# Portal guide

Operational reference for the Amakai client portal (`apps/portal`). For product requirements see [SDLC.md](./SDLC.md). For workflow node types see [Workflow_Nodes_Reference.md](./Workflow_Nodes_Reference.md).

## Navigation

| Section | Routes | Purpose |
|---------|--------|---------|
| **Dashboard** | `/` | Live workflows, recent production runs |
| **Production** | `/production/runs`, `/production/history` | Execute deployed workflows; view run history |
| **Design** | `/design/workflows`, `/design/workflow-editor`, `/design/tables`, `/design/testing` | Author workflows and tables; test drafts in playground |
| **Operate** | `/operate/live-workflows`, `/operate/logs` | Monitor live workflows; grouped execution logs |
| **Resources** | `/resources/secrets` | Encrypted secrets vault + Connect Gmail / Outlook OAuth |
| **Community** | `/community` | Stub |
| **Administration** | `/admin/billing`, `/settings` | Billing (Free/Pro Checkout); Settings (profile + Stripe portal manage/unsubscribe) |

Legacy redirects (bookmarks):

| Old path | Redirects to |
|----------|--------------|
| `/deploy/*` | `/operate/live-workflows` |
| `/operate/alerts` | `/operate/logs?filter=alerts` |
| `/operate/monitoring` | `/operate/live-workflows` |
| `/operate/executions` | `/operate/live-workflows` |
| `/admin/billing/pro` | `/admin/billing` |

## Billing (Stripe)

| Surface | Route | Behavior |
|---------|-------|----------|
| **Plans / upgrade** | `/admin/billing` | Free vs Pro; Upgrade opens Stripe Checkout |
| **Manage / cancel** | `/settings` → Billing | Opens Stripe Customer Portal in a new tab |
| **Webhook** | `POST /api/stripe/webhook` | Sole Stripe → Amakai ingress; signature required in every env |

Entitlements:

- Plan is **never** set from the browser. Only the Stripe gateway writes plan after verified Checkout/webhook sync.
- Pro requires an **active/trialing** subscription that includes `STRIPE_PRO_PRICE_ID`.
- Cancel-at-period-end keeps Pro until the period ends; UI shows **Active until &lt;date&gt;** (not “renews”).
- After Checkout return, Billing auto-refreshes until Pro syncs, then shows congratulations.
- Authenticated users have **read-only** RLS on `user_billing_profiles`; Stripe IDs are AES-GCM encrypted at rest (`SECRETS_ENCRYPTION_KEY`).
- All Stripe SDK usage lives in `lib/stripe/gateway.ts` only.

## Workflow lifecycle

```mermaid
flowchart LR
  Draft[Design draft] --> Validate[Editor validate / Testing]
  Validate --> Deploy[Deploy to production]
  Deploy --> Live[Live workflow]
  Live --> Run[Production run]
  Run --> Operate[Logs + monitoring + executions]
```

### Design

- **Drafts** live in Supabase `workflows` (status `draft`).
- **Testing** (`/design/testing`) runs the in-process playground against draft graphs with manual trigger payloads and approval/wait simulation.
- **Validate** in the editor runs the same playground engine before deploy.
- **Auto-save** validates names and field lengths via Zod (`lib/validation/`). Incomplete integration nodes are allowed on drafts; stricter checks apply at playground run time.

### Input validation

Shared limits live in `lib/validation/limits.ts` (Zod schemas in `lib/validation/*`):

| Area | Limit |
|------|--------|
| Workflow / table / secret names | 30 characters; letters, numbers, spaces, `. - _ ( ) &` |
| Table columns | Up to 50; keys are snake_case |
| Trigger output field names | Up to 20 fields, 64 chars each (identifier pattern) |
| Node config strings | Per-field caps (code, compare values, emails, etc.) |

OAuth connect auto-names secrets from the mailbox local part (e.g. `Gmail abdullahrazi60`); the full address is stored in secret metadata.

### Triggers: testing vs live

The palette exposes a single **Trigger** component (`trigger.workflow`). Set **Mode** in the inspector:

| Mode | Testing / Validate | Live (after deploy) |
|------|-------------------|---------------------|
| **Manual** | Enter payload in Testing or Validate | **Production → Runs** only |
| **Webhook** | Simulated payload | `POST /api/webhooks/{token}` with JSON body (URL under **Operate → Live Workflows**) |
| **Signal** | Simulated payload | Same webhook URL; `triggerType` in run metadata is `signal` |
| **Schedule** | Simulated payload | Fires on the configured alarm (once / daily / weekdays / weekly). Requires a cron job calling `POST /api/internal/process-queue` every minute (see below) |
| **External tool** | Simulated sample email | Gmail Pub/Sub (`/api/integrations/gmail/push`) or Outlook Graph (`/api/integrations/outlook/webhook`) |

Legacy saved graphs may still reference catalog IDs `trigger.api` or `trigger.external-tool`; behavior is normalized to the unified Trigger modes above.

**Schedule worker:** set `CRON_SECRET` in `.env.local`, then call every minute:

```bash
curl -X POST "http://localhost:3001/api/internal/process-queue" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

That tick fires due schedule triggers, then processes queued executions.

**Inbound webhooks** do not use session auth. Public API prefixes are allowlisted in `utils/supabase/middleware.ts` (`/api/webhooks`, Stripe, integration push routes, process-queue).

### Templates

- **Design → Resources → Templates** (stack icon): drag onto the canvas or click **Use template**.
- Seven provider templates in categories (Starter, Approvals, Data ops, Routing, Scheduled, Webhooks) with **authored grid layouts** (branches are not flattened into one row).
- Configure integration/table nodes before deploy (e.g. pick a table for **Save contact** in **Webhook Intake Guard**).

### Deploy

- Single production target — no environment picker or version UI.
- Deploy from the workflow editor; overwrites the live graph (`workflow_versions.version = 'live'`).
- Published workflows appear under **Operate → Live Workflows** and on the dashboard.
- Deploy also registers **trigger subscriptions** (webhook tokens, Gmail watch / Outlook Graph subscriptions when configured).

### Integrations setup

1. Apply migration `20260803190000_secrets_and_triggers.sql`.
2. Set `SECRETS_ENCRYPTION_KEY` (or `SUPABASE_SECRET_KEY`) and OAuth client env vars — see `apps/portal/.env.example` (optional unless using Gmail/Outlook connect).
3. Connect Gmail / Outlook under **Resources → Secrets** (each user connects their own mailbox; env vars are app credentials only).
4. Add **Trigger** (webhook/schedule/integration modes), **External Tool**, or **HTTP Request** from the component palette.
5. Deploy; copy the webhook URL from **Operate → Live Workflows** when Trigger mode is **Webhook** or **Signal**.
6. For Gmail receive, configure Pub/Sub push to `/api/integrations/gmail/push` and set `GMAIL_PUBSUB_TOPIC`.
7. Schedule + queue worker: call `POST /api/internal/process-queue` every minute (protect with `CRON_SECRET`).

#### Testing inbound webhooks locally

1. Deploy a workflow whose Trigger mode is **Webhook** (template: **Webhook Intake Guard**).
2. Copy `NEXT_PUBLIC_PORTAL_URL/api/webhooks/{token}` from Operate (default local: `http://localhost:3001/...`).
3. Health check: `GET` the same URL → `{ "ok": true, "status": "active" }`.
4. POST JSON whose top-level keys match the trigger **Output fields** (e.g. `eventId`, `email`, `source`).

```bash
curl -s -X POST "http://localhost:3001/api/webhooks/YOUR-TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-001" \
  -d '{"eventId":"evt-1","email":"jane@example.com","source":"landing-page"}'
```

On Windows PowerShell use `curl.exe`, not the `Invoke-WebRequest` alias.

Configure **Save contact** (table + column mappings) before expecting a completed run. **Wait** nodes pause the playground but inbound webhook runs execute inline and do not resume after a wait — set wait to `0` ms or bypass that step when testing webhooks end-to-end.

Optional trigger auth: **Secret** (`X-Amakai-Signature` / HMAC) or **Public** (`X-Amakai-Key`).

### Production runs

- **Production → Runs**: select a live workflow, enter trigger field values (or custom JSON), run in production.
- Each run creates a row in `workflow_executions` with status, duration, trigger input, and step logs in `result` JSON.
- Inbound webhooks/email enqueue runs (`queued` → `running`) via `lib/data/inbound-runs.ts`.
- **Retention**: only the **20 most recent runs per workflow** are kept; older rows are deleted automatically.

### Operate

Per live workflow (`/operate/live-workflows/[id]/…`):

| Tab | Shows |
|-----|--------|
| **Monitoring** | Metrics derived from production runs (success rate, trigger latency, node health, graph-adaptive sections) |
| **Executions** | Run list with trigger input summary; expand or open detail sheet |

Global:

| Page | Shows |
|------|--------|
| **Logs** | One row per execution; filters **All**, **Alert**, **Log**, **Error**; legacy `?filter=alerts` still works |
| **Notification bell** | **Alert** and **error** logs grouped by execution; link opens logs with alert filter |

Alerts are not a separate nav item — they filter logs and the bell.

### Log levels (production)

Production run logs map to three levels:

| Level | Meaning |
|-------|---------|
| **alert** | Warnings and attention-worthy events (e.g. wait pauses, approvals pending) |
| **log** | Normal informational steps |
| **error** | Failures and stop-and-error nodes |

Playground-only levels (`info`, `success`, `warning`) are mapped into these three when persisted to production history.

## Amakai Assistant (AI)

Global assistant in a **right-side panel** (sparkle icon in the header). One model handles questions, step-by-step guidance, and build/deploy actions — intent is inferred from each message (no Ask/Guide/Build toggle).

| Surface | Behavior |
|---------|----------|
| **Header trigger** | Opens/closes the assistant sheet (`showOverlay={false}` so the app stays usable) |
| **Design editor** | Toolbar **AI** button or `?panel=ai` deep link opens the same panel |
| **Chat history** | Clock icon lists past threads; **+** starts a new chat |
| **Credits** | Shown in panel header and on **Administration → Billing** (1 credit = 1,000 billable tokens; output tokens count 4×) |

### Capabilities

- **RAG** over product docs, component catalog, and node definitions (`pgvector` + `search_product_knowledge`)
- **Workspace context** — indexed workflow/table drafts per user (`ai_workspace_chunks`)
- **Read tools** — list workflows, tables, secrets (names only), component catalog
- **Planning** — clarifying questions and build plans (user approval before writes)
- **Writes** — create/update workflows and tables; live canvas patches when the editor is open
- **Destructive** — deploy, delete, etc. require explicit confirmation in chat

### Setup

1. Set `GOOGLE_GENERATIVE_AI_API_KEY` in `apps/portal/.env.local` (see `.env.example`).
2. Apply AI migrations (`20260807160000`–`20260807170000` in `supabase/migrations/`).
3. Index knowledge (throttled for Gemini free-tier embed limits):

```bash
npm run ai:index --workspace=@amakai/portal
```

4. Re-run indexing after doc or catalog changes (content-hash dedupe skips unchanged chunks).

### API

| Route | Role |
|-------|------|
| `POST /api/ai/chat` | Streaming chat; persists threads/messages; returns `x-ai-thread-id` |

Server actions: `getAiQuotaAction`, `listAiThreadsAction`, `getAiThreadMessagesAction`.

## Execution engine (current)

Production and testing share `lib/engine/playground.ts`:

- Graph traversal, triggers, approvals, waits, loops, parallel branches
- Playground adds sample payloads when trigger fields are omitted; production runs use user-supplied trigger input
- Not a separate distributed workflow engine yet (see SDLC §7–10)

## Key files

| Area | Location |
|------|----------|
| Nav + breadcrumbs | `lib/navigation.ts` |
| Production runs | `lib/data/production-runs.ts`, `lib/actions/production-actions.ts` |
| Logs + insights | `lib/data/logs.ts`, `lib/operate/production-execution-insights.ts` |
| Monitoring profile | `lib/operate/workflow-monitoring-profile.ts` |
| Deploy / live list | `lib/data/deployments.ts` |
| Secrets | `lib/data/secrets.ts`, `lib/actions/secret-actions.ts` |
| Integration registry | `lib/integrations/registry/` |
| Email adapters | `lib/integrations/email/adapters.ts` |
| Inbound runs / webhooks | `lib/data/inbound-runs.ts`, `lib/data/schedule-runs.ts`, `app/api/webhooks/[token]/route.ts` |
| Trigger modes / legacy IDs | `lib/design/trigger-config.ts` |
| Schedule domain | `lib/domain/trigger-schedule.ts`, `lib/cron/expression.ts` |
| Templates catalog | `lib/data/templates.ts` |
| Input validation (Zod) | `lib/validation/` |
| Billing / plans | `lib/stripe/gateway.ts` (sole Stripe SDK entry), `lib/data/billing.ts`, `components/billing/`, `app/api/stripe/webhook` |
| AI assistant | `components/ai/`, `lib/ai/`, `app/api/ai/chat/route.ts`, `scripts/build-knowledge-index.ts` |
| Editor | `components/design/design-hub-view.tsx` |
| Views | `components/views/*` |

## Local setup

1. Copy `apps/portal/.env.example` → `apps/portal/.env.local` (Supabase keys; optional Stripe and `GOOGLE_GENERATIVE_AI_API_KEY` for the assistant).
2. Apply Supabase migrations (see [data layer README](../apps/portal/lib/data/README.md)).
3. `npm run dev:portal` → [http://localhost:3001](http://localhost:3001)
4. Optional AI: set `GOOGLE_GENERATIVE_AI_API_KEY`, apply AI migrations, then `npm run ai:index --workspace=@amakai/portal`.
5. Optional Stripe:
   - Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `SECRETS_ENCRYPTION_KEY` (encrypts Stripe IDs at rest).
   - Enable **Customer Portal** in the Stripe Dashboard.
   - Forward webhooks: `stripe listen --forward-to localhost:3001/api/stripe/webhook` (signature verification is required even in local/dev — never bypass it).
   - All Stripe API access goes through `lib/stripe/gateway.ts` only. Plan upgrades require a verified webhook/reconcile with the configured `STRIPE_PRO_PRICE_ID`; clients cannot set plan via the Data API (read-only RLS).

## Agent notes

- Read Next.js docs in `node_modules/next/dist/docs/` (Next.js 16).
- Session middleware: `apps/portal/middleware.ts` → `utils/supabase/middleware.ts` (`updateSession`). Inbound API routes are public-path allowlisted; do not require login for `/api/webhooks/*`.
- Portal data accessors: [apps/portal/lib/data/README.md](../apps/portal/lib/data/README.md).
- Minimize scope: one accessor or route at a time; keep views presentational.
