import type { NodeConfig, NodeKind } from "@/lib/domain/workflow"

/** One palette category per base workflow block type. */
export type BaseComponentCategoryId =
  | "trigger"
  | "action"
  | "parallel"
  | "condition"
  | "loop"
  | "approval"
  | "exception"

export type ExtendedComponentCategoryId =
  | "integrations"
  | "ai"
  | "communication"

export type ComponentCategoryId =
  | BaseComponentCategoryId
  | ExtendedComponentCategoryId

export type ComponentCatalogCategory = {
  id: ComponentCategoryId
  label: string
  description: string
  /** Node kind shared by the base block and variants in this category. */
  baseKind?: NodeKind
}

export type ComponentCatalogItem = {
  /** Stable catalog id, e.g. `trigger.workflow` or `action.code`. */
  id: string
  kind: NodeKind
  label: string
  description: string
  categoryId: ComponentCategoryId
  /** Generic building block for the category (one per base category). */
  isBase?: boolean
  defaultLabel?: string
  defaultConfig?: NodeConfig
}

export const BASE_COMPONENT_CATEGORY_IDS: BaseComponentCategoryId[] = [
  "trigger",
  "action",
  "parallel",
  "condition",
  "loop",
  "approval",
  "exception",
]

export const COMPONENT_CATEGORIES: ComponentCatalogCategory[] = [
  {
    id: "trigger",
    label: "Trigger",
    description: "Start workflows — entry points with no incoming connections",
    baseKind: "trigger",
  },
  {
    id: "action",
    label: "Action",
    description: "Transform, combine, and process workflow data",
    baseKind: "sequential",
  },
  {
    id: "parallel",
    label: "Parallel",
    description: "Run multiple branches at the same time",
    baseKind: "parallel",
  },
  {
    id: "condition",
    label: "Condition",
    description: "Route or filter items based on rules",
    baseKind: "conditional",
  },
  {
    id: "loop",
    label: "Loop",
    description: "Iterate over collections or pause execution",
    baseKind: "loop",
  },
  {
    id: "approval",
    label: "Approval",
    description: "Pause the workflow for human review",
    baseKind: "approval",
  },
  {
    id: "exception",
    label: "Exception",
    description: "Stop execution or handle failures",
    baseKind: "exception",
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "Connectors for external apps and services",
  },
  {
    id: "ai",
    label: "AI",
    description: "Models, prompts, and intelligent steps",
  },
  {
    id: "communication",
    label: "Communication",
    description: "Email, messaging, and notifications",
  },
]

/** Base blocks for categories not covered by the port specification. */
const BASE_COMPONENTS: ComponentCatalogItem[] = [
  {
    id: "parallel.base",
    kind: "parallel",
    label: "Parallel",
    description: "Split the flow into concurrent branches",
    categoryId: "parallel",
    isBase: true,
  },
  {
    id: "approval.base",
    kind: "approval",
    label: "Approval",
    description: "Pauses the workflow until an approver accepts or rejects.",
    categoryId: "approval",
    isBase: true,
  },
]

/** Specialized components from Workflow_Node_Port_Specification.md */
export const COMPONENT_VARIANTS: ComponentCatalogItem[] = [
  {
    id: "trigger.workflow",
    kind: "trigger",
    label: "Trigger",
    description: "Starts the workflow. Cannot have incoming connections.",
    categoryId: "trigger",
  },
  {
    id: "action.code",
    kind: "sequential",
    label: "Code",
    description: "Executes JavaScript or Python code.",
    categoryId: "action",
    defaultConfig: { language: "javascript" },
  },
  {
    id: "action.data-table",
    kind: "sequential",
    label: "Data Table",
    description: "Reads or writes persistent workflow data.",
    categoryId: "action",
    defaultConfig: { operation: "read" },
  },
  {
    id: "action.date-time",
    kind: "sequential",
    label: "Date & Time",
    description: "Creates or manipulates date/time values.",
    categoryId: "action",
    defaultConfig: { operation: "format" },
  },
  {
    id: "action.edit-fields",
    kind: "sequential",
    label: "Edit Fields (Set)",
    description: "Adds, removes, or modifies fields.",
    categoryId: "action",
  },
  {
    id: "action.merge",
    kind: "sequential",
    label: "Combine Branches",
    description:
      "Synchronizes multiple paths after Parallel — waits for all inputs (default 2, configurable), then merges payloads.",
    categoryId: "action",
    defaultConfig: { inputCount: 2 },
  },
  {
    id: "action.aggregate",
    kind: "sequential",
    label: "Group Items",
    description:
      "Groups rows in a list by a shared field (like SQL GROUP BY). Use after Loop or Read Table.",
    categoryId: "action",
  },
  {
    id: "action.rename-keys",
    kind: "sequential",
    label: "Rename Keys",
    description: "Renames object properties.",
    categoryId: "action",
  },
  {
    id: "action.sort",
    kind: "sequential",
    label: "Sort",
    description: "Reorders incoming items.",
    categoryId: "action",
    defaultConfig: { direction: "asc" },
  },
  {
    id: "condition.if",
    kind: "conditional",
    label: "IF",
    description: "Routes execution based on a boolean condition.",
    categoryId: "condition",
  },
  {
    id: "condition.switch",
    kind: "conditional",
    label: "Switch",
    description:
      "Routes execution to the first matching case. Each case compares an upstream JSON field using predefined operators (equals, contains, greater than, etc.) — not JavaScript.",
    categoryId: "condition",
    defaultConfig: { caseCount: 2, includeDefaultOutput: false },
  },
  {
    id: "condition.filter",
    kind: "conditional",
    label: "Filter",
    description: "Removes items that do not satisfy a condition.",
    categoryId: "condition",
  },
  {
    id: "loop.over-items",
    kind: "loop",
    label: "Loop Over Items",
    description: "Iterates over an array collection and signals completion.",
    categoryId: "loop",
  },
  {
    id: "loop.wait",
    kind: "loop",
    label: "Wait",
    description: "Pauses execution before continuing.",
    categoryId: "loop",
    defaultConfig: { durationMs: 1000 },
  },
  {
    id: "exception.stop-and-error",
    kind: "exception",
    label: "Stop and Error",
    description: "Immediately terminates workflow execution.",
    categoryId: "exception",
  },
  {
    id: "trigger.external-tool",
    kind: "trigger",
    label: "External Tool Trigger",
    description:
      "Start a workflow from an external service (e.g. receive Gmail or Outlook email).",
    categoryId: "integrations",
    defaultConfig: {
      service: "email",
      provider: "gmail",
      operation: "receive",
      authMode: "secret",
    },
  },
  {
    id: "integrations.external-tool",
    kind: "sequential",
    label: "External Tool",
    description:
      "Call an external service (e.g. send Gmail or Outlook email, emit webhooks).",
    categoryId: "integrations",
    defaultConfig: {
      service: "email",
      provider: "gmail",
      operation: "send",
      authMode: "secret",
    },
  },
  {
    id: "trigger.api",
    kind: "trigger",
    label: "API Trigger",
    description:
      "Start a workflow from a webhook URL, schedule, manual run, or signal.",
    categoryId: "integrations",
    defaultConfig: {
      triggerMode: "webhook",
      authMode: "none",
    },
  },
  {
    id: "integrations.http-request",
    kind: "sequential",
    label: "HTTP Request",
    description: "Call an external REST API with method, URL, headers, and body.",
    categoryId: "integrations",
    defaultConfig: {
      service: "api",
      provider: "rest",
      operation: "request",
      method: "GET",
      authMode: "secret",
      timeoutMs: 15000,
    },
  },
]

export const COMPONENT_CATALOG: ComponentCatalogItem[] = [
  ...BASE_COMPONENTS,
  ...COMPONENT_VARIANTS,
]

export type ComponentCatalogGroup = ComponentCatalogCategory & {
  items: ComponentCatalogItem[]
}

export function getComponentCatalogGroups(
  query = ""
): ComponentCatalogGroup[] {
  const normalized = query.trim().toLowerCase()

  const filtered = normalized
    ? COMPONENT_CATALOG.filter((item) => {
        const category = COMPONENT_CATEGORIES.find(
          (entry) => entry.id === item.categoryId
        )
        const haystack = [
          item.label,
          item.description,
          item.kind,
          item.id,
          category?.label,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()

        return haystack.includes(normalized)
      })
    : COMPONENT_CATALOG

  return COMPONENT_CATEGORIES.map((category) => ({
    ...category,
    items: filtered.filter((item) => item.categoryId === category.id),
  })).filter((group) => group.items.length > 0)
}

export function getComponentCatalogItemById(id: string) {
  return COMPONENT_CATALOG.find((item) => item.id === id)
}
