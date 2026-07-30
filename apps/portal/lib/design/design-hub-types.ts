export type ResourcesPanelTab = "components" | "templates"

export type DesignPanelParam = ResourcesPanelTab | "ai"

export const CANVAS_DROP_ID = "canvas-drop"
export const RESOURCES_PANEL_DROP_ID = "resources-panel"

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
