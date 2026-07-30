export type ResourcesPanelTab = "components" | "templates"

export type DesignPanelParam = ResourcesPanelTab | "ai"

export function parseDesignPanelParam(
  value: string | null | undefined
): DesignPanelParam {
  if (value === "ai" || value === "templates" || value === "components") {
    return value
  }

  return "components"
}

export function resourcesTabFromParam(
  value: string | null
): ResourcesPanelTab {
  return value === "templates" ? "templates" : "components"
}
