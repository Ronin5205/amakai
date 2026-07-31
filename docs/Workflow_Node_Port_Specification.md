# n8n Workflow Node Port Specification

This document defines the standard input/output ports for each supported workflow node in the workflow builder.

---

# Node Port Specification

| Category | Node | Inputs | Outputs | Output Type | Description |
|----------|------|:------:|:-------:|-------------|-------------|
| Trigger | Trigger | 0 | 1 | Single | Starts the workflow. Cannot have incoming connections. |
| Action | Code | 1 | 1 | Single | Executes JavaScript or Python code. |
| Action | Data Table | 1 | 1 | Single | Reads or writes persistent workflow data. |
| Action | Date & Time | 1 | 1 | Single | Creates or manipulates date/time values. |
| Action | Edit Fields (Set) | 1 | 1 | Single | Adds, removes, or modifies fields. |
| Action | Merge | 2 (minimum) | 1 | Single | Combines multiple execution branches into one. |
| Action | Aggregate | 1 | 1 | Single | Aggregates many items into a single item. |
| Action | Summarize | 1 | 1 | Single | Produces statistics such as totals, counts, averages, etc. |
| Action | Rename Keys | 1 | 1 | Single | Renames object properties. |
| Action | Sort | 1 | 1 | Single | Reorders incoming items. |
| Condition | IF | 1 | 2 | True / False | Routes execution based on a boolean condition. |
| Condition | Switch | 1 | Dynamic (2+) | Cases | Creates one output for each configured case. |
| Condition | Filter | 1 | 1 | Matching Items | Removes items that do not satisfy a condition. |
| Loop | Loop Over Items | 1 | 2 | Loop / Done | Iterates over a collection and signals completion. |
| Loop | Wait | 1 | 1 | Resume | Pauses execution before continuing. |
| Exception | Stop and Error | 1 | 0 | None | Immediately terminates workflow execution. |

---

# Special Behaviors

## Trigger
- Always **0 inputs**
- Always **1 output**
- Must be the workflow entry point.

## Merge
- Supports **2 inputs** by default.
- Architecture should support **dynamic inputs** in the future.

## IF
Outputs:
- True
- False

These outputs are fixed and cannot be changed.

## Switch
- Dynamic output count.
- One output is created for every configured case.
- Optional **Default** output.

## Loop Over Items

Outputs:

1. **Loop** - Executes once for each batch or item.
2. **Done** - Executes after every iteration has completed.

## Stop and Error
- Has **no output ports**.
- Execution stops immediately.

---

# Recommended Port Labels

| Node | Input Labels | Output Labels |
|------|--------------|---------------|
| Trigger | None | Output |
| Code | Input | Output |
| Data Table | Input | Output |
| Date & Time | Input | Output |
| Edit Fields (Set) | Input | Output |
| Merge | Input A, Input B | Output |
| Aggregate | Input | Output |
| Summarize | Input | Output |
| Rename Keys | Input | Output |
| Sort | Input | Output |
| IF | Input | True, False |
| Switch | Input | Case 1, Case 2, ..., Default |
| Filter | Input | Matching Items |
| Loop Over Items | Input | Loop, Done |
| Wait | Input | Resume |
| Stop and Error | Input | None |

---

# Cursor / Versa Implementation Notes

## Port Rules

- Every node exposes typed input and output ports.
- Trigger nodes cannot accept incoming connections.
- Exception nodes terminate execution and therefore expose no outputs.
- Condition nodes may expose multiple outputs.
- Action nodes generally expose one input and one output.
- Merge accepts multiple incoming connections but produces a single output.
- Loop nodes expose both an iteration output and a completion output.
- Switch outputs are generated dynamically from user configuration.

This schema should remain engine-agnostic so additional workflow engines can be supported without changing the frontend node model.
