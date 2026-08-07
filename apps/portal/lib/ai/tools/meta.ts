import type { AiToolSafety } from "@/lib/domain/ai"

export const READ_TOOL_META = [
  { name: "search_product_knowledge", safety: "read" as const },
  { name: "search_workspace", safety: "read" as const },
  { name: "list_workflows", safety: "read" as const },
  { name: "get_workflow", safety: "read" as const },
  { name: "list_data_tables", safety: "read" as const },
  { name: "get_data_table_schema", safety: "read" as const },
  { name: "list_component_catalog", safety: "read" as const },
  { name: "list_secret_names", safety: "read" as const },
  { name: "get_recent_executions", safety: "read" as const },
] satisfies Array<{ name: string; safety: AiToolSafety }>

export const PLANNING_TOOL_META = [
  { name: "ask_clarification", safety: "planning" as const },
  { name: "propose_build_plan", safety: "planning" as const },
] satisfies Array<{ name: string; safety: AiToolSafety }>

export const WRITE_TOOL_META = [
  { name: "create_data_table", safety: "additive" as const },
  { name: "add_data_table_columns", safety: "additive" as const },
  { name: "create_workflow", safety: "additive" as const },
  { name: "apply_workflow_graph", safety: "additive" as const },
  { name: "delete_workflow", safety: "destructive" as const },
  { name: "delete_data_table", safety: "destructive" as const },
  { name: "remove_data_table_columns", safety: "destructive" as const },
  { name: "deploy_workflow", safety: "destructive" as const },
] satisfies Array<{ name: string; safety: AiToolSafety }>

export const ALL_TOOL_META = [
  ...READ_TOOL_META,
  ...PLANNING_TOOL_META,
  ...WRITE_TOOL_META,
] as const
