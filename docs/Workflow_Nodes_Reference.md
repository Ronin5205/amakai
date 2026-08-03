# Workflow Nodes Reference

This document describes **every workflow node** currently available in the portal builder: ports, configuration, payload behavior, and how each node runs in **Testing**, **Validation**, **Production runs**, and the **playground engine** (`apps/portal/lib/engine/playground.ts`).

For portal routes and the design → deploy → production → operate lifecycle, see [Portal_Guide.md](./Portal_Guide.md).

For a compact port-only table aligned with n8n semantics, see [Workflow_Node_Port_Specification.md](./Workflow_Node_Port_Specification.md). This reference uses Amakai UI labels (**Combine Branches**, **Group Items**) where they differ from n8n names (**Merge**, **Aggregate**) and documents current playground runtime behavior.

---

## How data moves between nodes

### Payload shape

Every step passes a **JSON object** (`Record<string, unknown>`) downstream. The engine shallow-merges fields with `mergePayload` — later keys overwrite earlier ones at the top level, but nested objects are not deep-merged.

Incoming payloads are normalized with `ensureJsonObject` before processing.

### Field references

Node configuration uses **upstream field references** in the form `nodeId.fieldName` (stored in config as `upstream-field` pickers). At runtime these resolve to JSON paths within the current payload via `readJsonPath`.

Example: if node `trigger-1` outputs `{ amount: 120 }`, a downstream node can reference `trigger-1.amount` to read `120`.

### Port IDs and legacy aliases

Most single-input/single-output nodes use:

| Port | Role |
|------|------|
| `main-in` | Standard input |
| `main-out` | Standard output |

**Edit Fields** uses dynamic paired ports: `input-1` … `input-N` and `output-1` … `output-N`. Connections on `main-in` / `main-out` are treated as the first pair.

**Combine Branches** (Merge) uses `input-1` … `input-N` (default **2**, configurable). Legacy edges may still use `input-a` / `input-b`, which map to `input-1` / `input-2`.

Branch-style outputs (IF, Switch, Approval, Parallel) use port types `branch` in the schema; loop nodes use `loop` and `done`.

### Catalog IDs vs node kinds

Palette items have a stable **catalog ID** (e.g. `action.merge`) stored in `node.config.catalogItemId`. The **node kind** (`trigger`, `sequential`, `parallel`, `conditional`, `loop`, `approval`, `exception`) determines which engine switch handles the node.

Some kinds share one engine path but differ by catalog ID (e.g. all `sequential` actions).

---

## Shared comparison rules

**IF**, **Filter**, and **Switch** cases use predefined operators from `comparison-rules.ts` — **no JavaScript expressions**.

| Operator | Value | Behavior |
|----------|-------|----------|
| `equals` | equals | Strict equality, or string comparison if types differ |
| `not_equals` | not equals | Inverse of equals |
| `greater_than` | greater than | Numeric compare when both sides are numbers; otherwise lexicographic string compare |
| `less_than` | less than | Same as above |
| `contains` | contains | For arrays: any element matches; for strings: case-insensitive substring |

**Compare values** are coerced before evaluation:

- `true`, `false`, `null` → boolean / null literals
- Numeric strings → numbers
- Valid JSON → parsed value
- Otherwise → plain string

**Switch** evaluates cases **top to bottom**; the **first matching case wins**. If none match and **Include fallback output** is enabled, execution routes to the `default` (Fallback) port. If no case matches and fallback is disabled, the run fails. Fallback is **off by default**.

---

## Playground engine notes

Testing and Validation use the playground engine. Behavior below is what the engine **actually does today**. Where design intent differs, it is called out.

| Area | Current playground behavior |
|------|----------------------------|
| **IF** | Evaluates the comparison rule and routes to **`true`** or **`false`**. |
| **Filter** | Evaluates the rule; matching payloads pass on **Kept** (`matching-items`); non-matching payloads are **dropped** (no downstream edges). |
| **Loop Over Items** | Fans out **loop** paths per item; **done** fires **once** after all loop-body work units finish. |
| **Combine Branches** | Waits for **all** configured inputs (default 2, up to N) before merging — a sync barrier. |
| **Sort**, **Date & Time** | Validates required fields, then **pass-through stub** (no sort/format logic). |
| **Code** | Validates non-empty code, adds `lastAction` to payload; **does not execute** JavaScript/Python. |
| **Parallel `maxConcurrency`** | Config exists but **does not trim** branch ports; all connected branch outputs fire. |
| **Exception (base kind)** | Pass-through on `recovered` if used; only **Stop and Error** is in the palette. |

Pause/resume nodes (**Approval**, **Wait**) stop the run until the user approves/rejects or the wait timer completes in Testing/Validation.

**Merge warning:** because Combine Branches waits for every connected input, it is a poor fit for rejoining mutually exclusive IF branches — prefer keeping exclusive paths separate or using Switch.

---

## Trigger

### Trigger (`trigger.workflow`)

**Kind:** `trigger`  
**Inputs:** none (cannot receive incoming connections)  
**Outputs:** `main-out`

#### Configuration

| Field | Type | Description |
|-------|------|-------------|
| `triggerType` | select | `webhook`, `schedule`, or `manual` (default `manual`) — **metadata only**; does not register a live webhook. Use **API Trigger** for inbound HTTP. |
| `outputFields` | output-fields | Declares fields added to the starting payload |

New triggers default to one object field: `{ name: "payload", type: "object" }`.

#### Runtime behavior

1. Builds the initial payload from configured output fields.
2. In **Testing**, values come from the trigger input panel; in **Validation** without custom values, sample data is auto-filled.
3. Always adds metadata: `triggeredAt`, `triggerType`, and `playground: true` when using sample fill.

#### Array fields in Testing

Array-typed trigger fields accept **comma-separated values** (e.g. `a, b, c`). JSON array syntax (`["a","b"]`) is also accepted when the input starts with `[`.

#### Example output

```json
{
  "playground": true,
  "orders": [
    { "orderId": "ord-1", "amount": 120, "status": "pending" },
    { "orderId": "ord-2", "amount": 85, "status": "pending" }
  ],
  "triggeredAt": "2026-08-01T12:00:00.000Z",
  "triggerType": "manual"
}
```

Use an **array** output field when feeding **Loop Over Items**.

---

### External Tool Trigger (`trigger.external-tool`)

**Kind:** `trigger`  
**Category:** Integrations  
**Inputs:** none  
**Outputs:** `main-out`

Starts a workflow from an external service receive operation (currently **Gmail** / **Outlook** email receive).

#### Configuration

Cascade: **Service → Provider → Operation** (must be a `receive` operation for trigger nodes).

| Field | Description |
|-------|-------------|
| `service` | e.g. `email` |
| `provider` | `gmail` or `outlook` |
| `operation` | `receive` |
| `authMode` | Must be `secret` for OAuth providers |
| `secretName` | Connected mailbox from Resources → Secrets |
| `outputFields` | Defaults: from, to, subject, body, bodyHtml, messageId, threadId, receivedAt, attachments |

Secret names auto-generated on OAuth connect use the mailbox local part (e.g. `Gmail user`) — not the full email address (see name validation in `lib/validation/`).

#### Runtime

- **Playground / Testing:** simulates a sample inbound email payload.
- **Production:** Gmail Pub/Sub push (`/api/integrations/gmail/push`) or Outlook Graph notifications (`/api/integrations/outlook/webhook`) enqueue a run with the normalized message.

Requires OAuth connect under **Resources → Secrets**, and for Gmail inbound set `GMAIL_PUBSUB_TOPIC`.

---

### API Trigger (`trigger.api`)

**Kind:** `trigger`  
**Category:** Integrations  
**Inputs:** none  
**Outputs:** `main-out`

#### Configuration

| Field | Description |
|-------|-------------|
| `triggerMode` | `webhook`, `schedule`, `manual`, or `signal` |
| `webhookToken` | Auto-generated on create/deploy; URL `/api/webhooks/{token}` |
| `authMode` | `none`, `secret` (HMAC / signing secret), or `public` (`X-Amakai-Key`) |
| `secretName` | Signing secret when auth is Secret |
| `publicApiKey` | Header value when auth is Public |
| `outputFields` | Declared webhook/signal payload schema |

#### Runtime

| Mode | Testing / Validate | Live (deployed) |
|------|-------------------|-----------------|
| `webhook` | Simulated — provide payload in Testing or Validate | `POST /api/webhooks/{token}` with JSON body; optional HMAC or `X-Amakai-Key` auth |
| `manual` | Simulated | **Production → Runs** only |
| `schedule`, `signal` | Simulated | **Not auto-fired yet** (UI placeholder) |

On deploy, a webhook subscription is registered and the public URL appears under **Operate → Live Workflows**.

---

## Action nodes

All action nodes are **kind** `sequential` unless noted. Standard port: `main-in` → `main-out`, except where listed.

---

### External Tool (`integrations.external-tool`)

**Category:** Integrations  

Cascade: **Service → Provider → Operation** (must be a sequential operation such as `send` or `emit`).

#### Email send (Gmail / Outlook)

| Field | Description |
|-------|-------------|
| `secretName` | OAuth secret from Resources → Secrets |
| `toField` | Upstream recipient field |
| `subjectField` / `subjectText` | Subject source |
| `bodyField` / `bodyText` | Body source |
| `ccField` / `bccField` | Optional |

Playground simulates send; production calls Gmail API `users.messages.send` or Microsoft Graph `me/sendMail`.

---

### HTTP Request (`integrations.http-request`)

**Category:** Integrations  

Outbound REST call with method, URL (field or text), headers JSON, body, timeout, and credentials (`secret` / `public` / `none`).

Playground stubs a 200 response; production performs `fetch`.

---

### Code (`action.code`)

**Purpose:** Run custom JavaScript or Python.

#### Configuration

| Field | Type | Required |
|-------|------|----------|
| `language` | `javascript` \| `python` | — |
| `code` | code editor | yes |

#### Inputs / outputs

- **In:** `main-in` — previous step payload  
- **Out:** `main-out` — transformed payload

#### Runtime behavior

- Fails if `code` is empty.
- Playground: shallow-copies input object, sets `lastAction` to the node label, does **not** run the code.

---

### Data Table (`action.data-table`)

**Purpose:** Read from or write to tables defined under **Design → Tables**.

#### Configuration

| Field | Type | Description |
|-------|------|-------------|
| `operation` | `read` \| `write` | Default `read` |
| `tableName` | table-select | Required table name |
| `enableFind` | boolean | For read: filter rows instead of returning all rows |
| `findColumn` | table-column-select | Column to compare when finding rows |
| `findOperator` | select | `equals`, `not_equals`, `greater_than`, `less_than`, `contains` |
| `findValue` | string | Static value to compare (optional if `findValueField` is set) |
| `findValueField` | upstream-field | Upstream field to use as the find value |
| `writeMode` | `insert` \| `upsert` | Default `insert` |
| `matchColumn` | table-column-select | For upsert: column used to locate the existing row |
| `matchValueField` | upstream-field | For upsert: upstream field whose value is matched |
| `columnMappings` | table-column-map | For write: map table columns → upstream fields |

#### Runtime behavior

**Read**

- Loads all rows from the table, or only matching rows when **Find rows** is enabled.
- Merges into payload:

```json
{
  "dataTableName": "Orders",
  "dataTableOperation": "read",
  "dataTableRows": [ { "...": "row data" } ],
  "dataTableRowCount": 3,
  "dataTableFindEnabled": true,
  "dataTableRow": { "...": "single match when exactly one row is found" }
}
```

When find is enabled, `dataTableRow` is added only when exactly one row matches.

**Write**

- **Insert** (default): appends one new row from column mappings.
- **Upsert**: finds an existing row where `matchColumn` equals the resolved `matchValueField`, updates mapped columns on that row, or inserts if no match exists.
- Adds: `dataTableName`, `dataTableOperation: "write"`, `dataTableWriteMode`, `dataTableRowUpdated`, `dataTableRow`.

Fails if table name is missing or the server action returns an error.

---

### Date & Time (`action.date-time`)

**Purpose:** Format, parse, or add intervals to date values.

#### Configuration

| Field | Type |
|-------|------|
| `operation` | `format` \| `parse` \| `add` |
| `sourceField` | upstream-field (required) |

#### Runtime behavior

Playground: validates `sourceField`, then pass-through stub. Date manipulation is not implemented in the engine yet.

---

### Edit Fields (Set) (`action.edit-fields`)

**Purpose:** Map upstream values to new or updated output field names. Supports **multiple independent input/output pairs**.

#### Configuration

| Field | Type | Description |
|-------|------|-------------|
| `fieldCount` | number | 1–12 pairs (default 1) |
| `fieldEdits` | field-edit-table | Each row: `name` (output key), `sourceField` (upstream ref) |

#### Ports (dynamic)

For `fieldCount = N`:

| Inputs | Outputs |
|--------|---------|
| `input-1` … `input-N` | `output-1` … `output-N` |

Port labels use the configured output name when set. First input (`input-1`) is **required** for graph validation.

Legacy: `main-in` / `main-out` map to the first pair.

#### Runtime behavior

1. Validates every row has both `name` and `sourceField`.
2. For each row, reads the source value and sets `[name]` on a copy of the payload.
3. **Fan-out:** each `output-N` port receives a payload containing **only that row’s mapping** applied (plus prior payload fields merged).
4. The combined result (all mappings applied sequentially) is stored as the node’s primary output payload for logging.

Example: mapping `amount` → `total` with source `trigger-1.amount`:

```json
{ "...previousFields", "total": 120 }
```

---

### Combine Branches (`action.merge`)

**Purpose:** Synchronize multiple paths (e.g. after **Parallel**) and merge their payloads into one. n8n name: **Merge**.

#### Ports

| Inputs | Output |
|--------|--------|
| `input-1` … `input-N` (default **2**, configurable via `inputCount`) | `main-out` (**Output**) |

Legacy edge ports `input-a` / `input-b` map to `input-1` / `input-2`.

#### Configuration

| Field | Type | Description |
|-------|------|-------------|
| `inputCount` | number | Number of input ports (min 2, max 8). Default `2`. |

#### Runtime behavior

1. **Buffering:** The engine waits until **all** configured inputs have arrived (`merge-buffer.ts`).
2. When ready, folds payloads with `mergeBranchPayloads` / `mergeManyBranchPayloads`:
   - Top-level keys from all branches are combined.
   - Colliding keys with different values: later branch values are stored as `branchN_<key>`.
   - Always adds: `branches` (array of branch payloads), `mergedAt`, `mergeSourceCount`.
3. Graph validation fails if any required input port is unconnected.

**Caveat:** Merge is a sync barrier — it pulls data from every connected input. Do not use it to rejoin mutually exclusive IF true/false paths.

While waiting, the run logs which input arrived and that it is waiting for the remaining inputs.

---

### Group Items (`action.aggregate`)

**Purpose:** Group an array of items by a field (SQL `GROUP BY` style). Catalog ID remains `action.aggregate`.

#### Configuration

| Field | Type | Description |
|-------|------|-------------|
| `itemsField` | upstream-field | Optional array field; auto-detected if empty |
| `groupByField` | upstream-field | Required property name on each item |

#### Auto-detection for items

When `itemsField` is empty, the engine looks for the first array among:  
`dataTableRows`, `loopItems`, `items`, `orders`, `rows`, `records`.

#### Runtime behavior

Adds to payload:

```json
{
  "groups": {
    "pending": [ { "...": "item" } ],
    "shipped": [ { "...": "item" } ]
  },
  "groupKeys": ["pending", "shipped"],
  "groupCount": 2,
  "itemCount": 5,
  "aggregatedBy": "status"
}
```

Items missing the group field are bucketed under `"unknown"`.

---

### Rename Keys (`action.rename-keys`)

**Purpose:** Rename top-level payload properties.

#### Configuration

| Field | Type |
|-------|------|
| `renames` | field-rename-table (`fromField`, `toField`) |

#### Runtime behavior

- Validates all rename rows are complete.
- For each row, copies `fromField` → `toField` on the payload object and deletes the old key when names differ.
- Only renames **top-level** keys (field name is taken after the `.` in upstream refs).

---

### Sort (`action.sort`)

**Purpose:** Reorder items in a collection by a field.

#### Configuration

| Field | Type |
|-------|------|
| `sortField` | upstream-field (required) |
| `direction` | `asc` \| `desc` (default `asc`) |

#### Runtime behavior

Playground: validates `sortField`, then pass-through stub. Sorting logic is not implemented yet.

---

## Parallel

### Parallel (`parallel.base`)

**Kind:** `parallel` (no variant catalog ID; uses base node definition)

**Purpose:** Fan out the same payload to multiple branches concurrently.

#### Configuration

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `maxConcurrency` | number | 3 | UI/config only today; does not hide extra branch ports |

#### Ports

| Input | Outputs |
|-------|---------|
| `main-in` | `branch-a`, `branch-b`, `branch-c` |

#### Runtime behavior

After the node runs, the engine enqueues downstream work for **every output port that has a connected edge**, each carrying the **same payload**. Unconnected branch ports are skipped.

Typical pattern: **Parallel** → two branch chains → **Combine Branches**.

---

## Condition nodes

All condition nodes are **kind** `conditional`.

---

### IF (`condition.if`)

**Purpose:** Route to **True** or **False** based on one comparison rule.

#### Ports

| Input | Outputs |
|-------|---------|
| `main-in` | `true`, `false` |

#### Configuration

| Field | Type |
|-------|------|
| `field` | upstream-field (required) |
| `operator` | comparison operator |
| `compareValue` | string (required) |

#### Runtime behavior

- Validates field and compare value.
- Evaluates with `evaluateComparisonRule` and routes to **`true`** or **`false`**.

---

### Switch (`condition.switch`)

**Purpose:** Route to the first matching case, or optional **Fallback**.

#### Ports (dynamic)

| Input | Outputs |
|-------|---------|
| `main-in` | `case-1` … `case-N`, optionally `default` (Fallback) |

Controlled by `caseCount` (minimum 2) and `includeDefaultOutput` (default **`false`**).

#### Configuration

| Field | Type |
|-------|------|
| `caseCount` | number |
| `includeDefaultOutput` | boolean — when true, adds Fallback port |
| `switchCases` | switch-rules table |

Each non-fallback case requires: `field`, `operator`, `compareValue`. The **Fallback** case has no rule.

#### Runtime behavior

1. Validates all non-fallback cases.
2. Evaluates cases in order with `evaluateComparisonRule`.
3. Emits on the first matching port, or `default` if fallback is enabled and nothing matched.
4. Fails if no match and fallback is disabled.

---

### Filter (`condition.filter`)

**Purpose:** Emit only payloads that satisfy a condition; drop the rest.

#### Ports

| Input | Output |
|-------|--------|
| `main-in` | `matching-items` (label **Kept**) |

#### Configuration

Same single-rule shape as IF: `field`, `operator`, `compareValue`.

#### Runtime behavior

- Validates config.
- Evaluates the rule against the current payload.
- **Match:** pass through on `matching-items`.
- **No match:** drop — no downstream edges are enqueued.

---

## Loop nodes

All loop nodes are **kind** `loop`.

---

### Loop Over Items (`loop.over-items`)

**Purpose:** Iterate over a collection; fire **Loop** once per item, then **Done** once when every loop-body path has finished.

#### Ports

| Input | Outputs |
|-------|---------|
| `main-in` | `loop`, `done` |

#### Configuration

| Field | Type |
|-------|------|
| `collectionField` | upstream-field (required) |

#### Collection resolution

The field value is normalized via `normalizeCollection`:

- Arrays → used as-is  
- Comma-separated strings → split into strings  
- JSON array strings → parsed  
- Single object/scalar → wrapped in a one-element array  
- Empty / missing → zero items  

#### Runtime behavior

**Zero items**

- Exits immediately on **`done`** with:

```json
{ "loopCompleted": true, "loopItemCount": 0 }
```

**One or more items**

- Does not use a single `outputPort`; instead sets `loopItems` on the result.
- For each item, enqueues **`loop`** downstream edges with payload:

```json
{
  "...parentPayload",
  "item": { "...": "current item" },
  "loopItem": { "...": "same as item" },
  "loopIndex": 0,
  "loopTotal": 3
}
```

- Tracks pending loop-body work units (`loop-completion.ts`). **Done is not enqueued yet.**
- When every loop-body path finishes (no further downstream edges), enqueues **`done` once** with:

```json
{
  "...parentPayload",
  "loopCompleted": true,
  "loopItemCount": 3
}
```

**Done fires exactly once after the final batch**, not per iteration.

---

### Wait (`loop.wait`)

**Purpose:** Pause execution for a fixed duration, then continue.

#### Ports

| Input | Output |
|-------|--------|
| `main-in` | `resume` |

#### Configuration

| Field | Type | Default |
|-------|------|---------|
| `durationMs` | number | 1000 |

#### Runtime behavior

1. First visit: returns `pendingWait`; Testing/Validation shows a timer and pauses the run.
2. After wait completes (or user resumes in testing): continues on **`resume`** with:

```json
{
  "...payload",
  "waitedMs": 1000,
  "resumedAt": "2026-08-01T12:00:01.000Z"
}
```

---

## Approval

### Approval (`approval.base`)

**Kind:** `approval`

**Purpose:** Pause until a human approves or rejects.

#### Ports

| Input | Outputs |
|-------|---------|
| `main-in` | `approved`, `rejected` |

#### Configuration

| Field | Type | Description |
|-------|------|-------------|
| `approverType` | `manual` \| `email` \| `role` | Default `manual` |
| `approverEmail` | string | Required when type is `email` |
| `approverRole` | string | Required when type is `role` |

#### Runtime behavior

1. Validates approver config.
2. First visit: `pendingApproval` — run pauses; Testing/Validation shows Approve/Reject controls.
3. **Approved** → `approved` port, payload gains:

```json
{
  "approvedBy": "manual-approver",
  "approvedAt": "...",
  "approvalType": "manual",
  "approverRole": undefined
}
```

4. **Rejected** → `rejected` port, payload gains `rejectedBy`, `rejectedAt`, etc.

Actor label varies by approver type (email address, role name, etc.).

---

## Exception

### Stop and Error (`exception.stop-and-error`)

**Kind:** `exception`

**Purpose:** Terminate the workflow immediately with an error message.

#### Ports

| Input | Outputs |
|-------|--------|
| `main-in` | **none** (terminal) |

#### Configuration

| Field | Type |
|-------|------|
| `errorMessage` | string |

#### Runtime behavior

- Marks the node as **terminal**; no downstream edges fire.
- Logs `errorMessage` or default `"Workflow stopped (Stop and Error)"`.
- Validation treats this as a successful node exit that ends the flow.

### Exception handler (base `exception` kind)

Not exposed as a separate palette item. If present, playground pass-through on `recovered` with stub messaging. **Stop and Error** is the supported exception variant.

---

## Common workflow patterns

### Parallel → Combine Branches

```
Trigger → Parallel → [Branch A chain]
                    → [Branch B chain]
              → Combine Branches → ...
```

Combine Branches blocks until all configured inputs (`input-1` … `input-N`) have received a payload.

### Loop → Group Items

```
Trigger (array field) → Loop Over Items (loop) → ... per item ...
                     → Loop Over Items (done) → Group Items
```

Group Items can read `itemsField` explicitly or auto-detect `loopItems` / table read results.

### Switch → Wait → Edit Fields

Each switch case connects to its own branch (see **demo-switch-lab** template). Switch evaluates rules; Wait pauses; Edit Fields maps branch-specific outputs.

### IF → Approval

Use IF **true** / **false** branches for mutually exclusive paths (IF evaluates the rule in the playground). Approval pauses until manual decision.

---

## Graph validation rules

**Draft auto-save** (`lib/validation/`, Zod): enforces name/field length and character rules. Incomplete integration nodes are allowed.

**Playground / Validate** rejects runs when:

- No trigger node exists  
- Any node is unreachable from a trigger  
- A required input port has no incoming edge  
- **Combine Branches** is missing any required `input-1` … `input-N` connection  
- **Trigger** has no output fields (`trigger.workflow`, `trigger.api`)  
- Required config is missing (empty code, table name, comparison values, integration secret, etc.)

Integration nodes use stricter pre-run checks via `validateNodeConfigForRun` when wired into the playground.

Maximum **200 steps** per run (`MAX_PLAYGROUND_STEPS`) to prevent infinite loops.

---

## Testing tips

1. **Trigger arrays:** use comma-separated values (`order-1, order-2`) unless you intentionally pass JSON.
2. **Inspect payloads:** enable payload capture in Testing; the inspector shows runtime JSON per step.
3. **Paused runs:** Approval and Wait require user action or timer completion before continuing.
4. **IF / Switch / Filter** all evaluate comparison rules in Testing and Validation.
5. **Edit Fields fan-out:** connect each `output-N` to different downstream nodes when you need per-field paths.

---

## Source files

| Topic | Location |
|-------|----------|
| Catalog & labels | `apps/portal/lib/design/component-catalog.ts` |
| Port specs & config schema | `apps/portal/lib/design/component-variant-definitions.ts` |
| Input validation (Zod) | `apps/portal/lib/validation/` |
| Dynamic Edit Fields ports | `apps/portal/lib/design/edit-fields.ts` |
| Switch case model | `apps/portal/lib/design/switch-rules.ts` |
| Comparison operators | `apps/portal/lib/design/comparison-rules.ts` |
| Playground engine | `apps/portal/lib/engine/playground.ts` |
| Merge buffering | `apps/portal/lib/engine/merge-buffer.ts` |
| Loop completion | `apps/portal/lib/engine/loop-completion.ts` |
| Group Items transform | `apps/portal/lib/engine/payload-transforms.ts` |
| Loop collection parsing | `apps/portal/lib/engine/loop-collection.ts` |
| JSON / array parsing | `apps/portal/lib/design/json-value.ts` |
| Demo workflows | `apps/portal/lib/data/templates.ts` |
