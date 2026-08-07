import type { AiToolSafety } from "@/lib/domain/ai"
import type { WorkflowGraphDraft } from "@/lib/design/workflow-graph"

export type AiToolContext = {
  userId: string
  threadId?: string | null
  confirmationToken?: string | null
  editor?: {
    workflowId?: string | null
    selectedNodeId?: string | null
    /** When set, apply_workflow_graph returns a live-patch payload instead of saving. */
    liveCanvas: boolean
  } | null
}

export type AiToolDefinition = {
  name: string
  description: string
  safety: AiToolSafety
}

export type LiveGraphPatch = {
  kind: "live_graph_patch"
  workflowId: string
  graph: WorkflowGraphDraft
}

/** Full tool surface — the model decides when to answer, guide, or mutate. */
export const ASSISTANT_ALLOWED_SAFETY: AiToolSafety[] = [
  "read",
  "planning",
  "additive",
  "destructive",
]

export function isToolAllowed(safety: AiToolSafety): boolean {
  return ASSISTANT_ALLOWED_SAFETY.includes(safety)
}
