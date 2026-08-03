# Workflow Node Port Specification

This document defines the input/output ports for Amakai’s **core workflow nodes**, aligned with n8n core-node semantics (n8n 1.49.0+ / 2.x). Amakai UI labels may differ (e.g. **Combine Branches** for Merge, **Group Items** for Aggregate); catalog IDs and port behavior follow the table below.

For runtime payload details, see [Workflow_Nodes_Reference.md](./Workflow_Nodes_Reference.md).

---

# Node Port Specification

| Category | Node | Inputs | Outputs | Output Type | Description |
|----------|------|:------:|:-------:|-------------|-------------|
| Trigger | Trigger (Manual/Webhook/Schedule) | 0 | 1 | Single | Starts the workflow. Cannot have incoming connections. |
| Action | Code | 1 | 1 | Single | Executes JavaScript or Python code (playground does not run code yet — stub). |
| Action | Data Table | 1 | 1 | Single | Reads or writes rows in Design → Tables. |
| Action | Date & Time | 1 | 1 | Single | Formats, parses, or manipulates date/time values. |
| Action | Edit Fields (Set) | 1 | 1 | Single | Adds, removes, or modifies fields. |
| Action | Merge (Combine Branches) | **2 (default), configurable up to N** | 1 | Single | Combines multiple execution branches. See Merge notes. |
| Action | Aggregate (Group Items) | 1 | 1 | Single | Aggregates / groups many items into a single payload. |
| Action | Rename Keys | 1 | 1 | Single | Renames object properties. |
| Action | Sort | 1 | 1 | Single | Reorders incoming items. |
| Condition | If | 1 | 2 | True / False | Routes execution based on a boolean condition — evaluates at runtime. |
| Condition | Switch | 1 | Dynamic (per configured rule) + optional fallback | Cases | One output per configured rule; optional extra fallback for unmatched items. |
| Condition | Filter | 1 | 1 | Kept items only | Items that fail the condition are dropped, not routed elsewhere. |
| Loop | Loop Over Items (Split in Batches) | 1 | 2 | Loop / Done | Iterates in batches; **done** fires once after the last batch. |
| Loop | Wait | 1 | 1 | Resume | Pauses execution (timer) before continuing. |
| Exception | Stop and Error | 1 | 0 | None | Immediately terminates workflow execution with an error. |

---

# Special Behaviors

## Trigger
- Always **0 inputs**.
- Always **1 output**.
- Must be a workflow entry point — a workflow can have more than one trigger node, each independently starting a run.

## Merge — corrected behavior
- **Default: 2 inputs.** Raise **Number of Inputs** on the node to combine more than two streams without nesting Merge nodes.
- **Blocking/synchronizing behavior**: Merge waits for *all* connected inputs to execute before firing — this makes it a natural sync point after Parallel-style branching. Branches you did not intend to run will still need to run to feed the Merge node. Merge is often the **wrong** tool for rejoining mutually exclusive IF paths.
- Legacy edge ports `input-a` / `input-b` map to `input-1` / `input-2`.
- Amakai UI label: **Combine Branches**. Catalog ID remains `action.merge`.

## If
Outputs:
- True
- False

These are fixed at 2 and cannot be changed. The playground engine evaluates the comparison rule and routes accordingly.

## Switch — corrected behavior
- Dynamic output count: one output per configured rule.
- Rules are evaluated in order; first match wins.
- Optional extra **fallback** output catches items that do not match any rule — without it enabled, non-matching items fail the run (Amakai) rather than silently dropping. Fallback is **off by default**.

## Filter
- **1 output** (**Kept**) — non-matching payloads are silently excluded; they do not route to a separate rejected-items output. If you need both kept and discarded paths, pair Filter with an If node instead.
- Port id remains `matching-items` for saved-workflow compatibility; label is **Kept**.

## Loop Over Items — corrected behavior
Outputs:
1. **Loop** — fires once per batch (default batch size 1, i.e. once per item), for the branch that processes each item.
2. **Done** — fires **once**, after the final batch / loop-body path has completed, not once per iteration.

When the loop completes, processed data is combined and returned through the done output (`loopCompleted`, `loopItemCount`).

## Stop and Error
- Has **no output ports**.
- Execution stops immediately and the workflow run is marked as failed.

---

# Recommended Port Labels

| Node | Input Labels | Output Labels |
|------|--------------|---------------|
| Trigger | None | Output |
| Code | Input | Output |
| Data Table | Input | Output |
| Date & Time | Input | Output |
| Edit Fields (Set) | Input | Output |
| Merge | Input 1, Input 2, … Input N | Output |
| Aggregate | Input | Output |
| Rename Keys | Input | Output |
| Sort | Input | Output |
| If | Input | True, False |
| Switch | Input | Case 1, Case 2, …, (optional) Fallback |
| Filter | Input | Kept |
| Loop Over Items | Input | loop, done |
| Wait | Input | Resume |
| Stop and Error | Input | None |

---

# Implementation Notes for the Playground Engine

- **Merge defaults to 2 inputs but allows raising the count** — do not hardcode 2 as a ceiling.
- **Merge is a true synchronization barrier** — it does not fire on partial input.
- **If / Switch / Filter evaluate conditions for real** in Testing and Validation.
- **Loop “done” fires exactly once**, after all loop-body work units finish — not immediately when loop items are enqueued.
- **Switch’s fallback output is optional**, not automatic — do not assume every Switch has a default/catch-all port unless the user enabled one.

## Amakai extensions (not in core n8n table)

| Node | Notes |
|------|-------|
| Parallel | Fan-out to multiple branch outputs; often paired with Merge. |
| Approval | Pause/resume with approved / rejected ports. |

## Known playground stubs (intentional divergences)

| Node | Divergence |
|------|------------|
| Code | Does not execute JavaScript/Python; pass-through with `lastAction`. |
| Sort / Date & Time | Config validation only; no transform yet. |

---

# Source

Aligned with n8n’s official core-node docs (`docs.n8n.io/integrations/builtin/core-nodes/`) and community guidance on Merge and Loop Over Items behavior (n8n 1.49.0+ / 2.x, August 2026), adapted for Amakai’s single-JSON-payload playground engine.
