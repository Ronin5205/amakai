import { getComponentVariantSpec, getCatalogItemId } from "@/lib/design/component-variant-definitions"
import { getNodeDefinition } from "@/lib/design/node-definitions"
import type { NodeDefinition, WorkflowNode } from "@/lib/domain/workflow"

export function resolveNodeDefinition(node: WorkflowNode): NodeDefinition {
  const base = getNodeDefinition(node.kind)
  const catalogItemId = getCatalogItemId(node)
  const variant = getComponentVariantSpec(catalogItemId)

  if (!variant) {
    return base
  }

  const ports = variant.resolvePorts?.(node) ?? {
    inputs: variant.inputs,
    outputs: variant.outputs,
  }

  return {
    ...base,
    inputs: ports.inputs,
    outputs: ports.outputs,
    configSchema:
      variant.configSchema !== undefined ? variant.configSchema : base.configSchema,
  }
}

export { getCatalogItemId } from "@/lib/design/component-variant-definitions"
