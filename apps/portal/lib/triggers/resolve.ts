import type { WorkflowNode } from "@/lib/domain/workflow"
import { getCatalogItemId } from "@/lib/design/component-variant-definitions"
import {
  canonicalizeTriggerConfig,
  resolveTriggerRecipe,
} from "@/lib/design/trigger-config"
import type { ResolvedTriggerForSync } from "@/lib/triggers/types"

/**
 * Fully resolve a trigger node for deploy-time subscription sync.
 * Always returns canonical provider/operation for integration triggers
 * so sync never silently skips due to missing raw config fields.
 */
export function resolveTriggerForSync(
  node: WorkflowNode
): ResolvedTriggerForSync {
  const catalogItemId = getCatalogItemId(node)
  const config = canonicalizeTriggerConfig(node.config, {
    label: node.label,
    catalogItemId,
  })
  const recipe = resolveTriggerRecipe(config, {
    label: node.label,
    catalogItemId,
  })

  return {
    mode: recipe.mode,
    config,
    recipe,
  }
}

/** Return a node with canonicalized trigger config (for graph persistence on deploy). */
export function withCanonicalTriggerConfig(node: WorkflowNode): WorkflowNode {
  if (node.kind !== "trigger") {
    return node
  }

  const { config } = resolveTriggerForSync(node)
  return {
    ...node,
    config,
  }
}
