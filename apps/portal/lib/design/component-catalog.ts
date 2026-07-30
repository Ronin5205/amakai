import type { NodeKind } from "@/lib/domain/workflow"

export type ComponentCategoryId = "core" | "integrations" | "ai" | "communication"

export type ComponentCatalogCategory = {
  id: ComponentCategoryId
  label: string
  description: string
}

export type ComponentCatalogItem = {
  kind: NodeKind
  label: string
  description: string
  categoryId: ComponentCategoryId
}

export const COMPONENT_CATEGORIES: ComponentCatalogCategory[] = [
  {
    id: "core",
    label: "Core",
    description: "Essential workflow building blocks",
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

export const COMPONENT_CATALOG: ComponentCatalogItem[] = [
  {
    kind: "trigger",
    label: "Trigger",
    description: "Start a workflow from a webhook, schedule, or manual run",
    categoryId: "core",
  },
  {
    kind: "sequential",
    label: "Action",
    description: "Call an API or run a single processing step",
    categoryId: "core",
  },
  {
    kind: "parallel",
    label: "Parallel",
    description: "Run multiple branches at the same time",
    categoryId: "core",
  },
  {
    kind: "conditional",
    label: "Condition",
    description: "Split the flow when a rule matches",
    categoryId: "core",
  },
  {
    kind: "loop",
    label: "Loop",
    description: "Repeat steps for each item in a collection",
    categoryId: "core",
  },
  {
    kind: "approval",
    label: "Approval",
    description: "Pause the workflow for human review",
    categoryId: "core",
  },
  {
    kind: "exception",
    label: "Exception",
    description: "Handle errors with retry, skip, or notify",
    categoryId: "core",
  },
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
        const haystack = `${item.label} ${item.description} ${item.kind}`.toLowerCase()
        return haystack.includes(normalized)
      })
    : COMPONENT_CATALOG

  return COMPONENT_CATEGORIES.map((category) => ({
    ...category,
    items: filtered.filter((item) => item.categoryId === category.id),
  })).filter((group) => group.items.length > 0)
}

export function getComponentCatalogItem(kind: NodeKind) {
  return COMPONENT_CATALOG.find((item) => item.kind === kind)
}
