"use client"

import * as React from "react"
import { TrashIcon } from "@phosphor-icons/react"

import { NodeConfigFields } from "@/components/design/node-config-fields"
import { NodeRuntimePayloadSection } from "@/components/design/payload-inspector"
import { StatusBadge } from "@/components/portal/status-badge"
import { findLatestNodeStepPayloads } from "@/lib/engine/playground-payloads"
import type { PlaygroundStep } from "@/lib/engine/types"
import { getCatalogItemId, resolveNodeDefinition } from "@/lib/design/resolve-node-definition"
import type { Workflow, WorkflowNode } from "@/lib/domain/workflow"
import type { DataTableSummary } from "@/lib/domain/data-table"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@amakai/shared/components/ui/field"
import { Input } from "@amakai/shared/components/ui/input"

export interface NodeInspectorProps {
  node: WorkflowNode | null
  workflow: Workflow
  selectedCount: number
  dataTables?: DataTableSummary[]
  validationSteps?: PlaygroundStep[]
  onLabelChange: (label: string) => void
  onConfigChange: (key: string, value: unknown) => void
  onRemove: () => void
}

export function NodeInspector({
  node,
  workflow,
  selectedCount,
  dataTables,
  validationSteps = [],
  onLabelChange,
  onConfigChange,
  onRemove,
}: NodeInspectorProps) {
  if (selectedCount > 1) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">Node inspector</h2>
          <p className="text-xs text-muted-foreground">
            {selectedCount} nodes selected
          </p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-xs text-muted-foreground">
            Select one node to edit it.
          </p>
          <Button variant="outline" size="sm" onClick={onRemove}>
            <TrashIcon data-icon="inline-start" />
            Delete selected
          </Button>
        </div>
      </div>
    )
  }

  if (!node) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">Node inspector</h2>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-muted-foreground">
          No node selected
        </div>
      </div>
    )
  }

  const definition = resolveNodeDefinition(node)
  const catalogItemId = getCatalogItemId(node)
  const hasConfig = definition.configSchema.length > 0
  const runtimePayloads = findLatestNodeStepPayloads(validationSteps, node.id)

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-medium">{node.label}</h2>
          <StatusBadge status={node.kind} label={node.kind} />
        </div>
        {catalogItemId ? (
          <p className="mt-1 text-xs text-muted-foreground">
            {definition.description}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="flex flex-col gap-4 p-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="node-label">Label</FieldLabel>
              <Input
                id="node-label"
                value={node.label}
                onChange={(event) => onLabelChange(event.target.value)}
              />
            </Field>

            {hasConfig ? (
              <NodeConfigFields
                node={node}
                nodes={workflow.nodes}
                edges={workflow.edges ?? []}
                fields={definition.configSchema}
                values={node.config}
                idPrefix={`${node.id}-config`}
                dataTables={dataTables}
                onChange={onConfigChange}
              />
            ) : null}

            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Runtime JSON</h3>
              <NodeRuntimePayloadSection
                input={runtimePayloads?.input}
                output={runtimePayloads?.output}
              />
            </div>
          </FieldGroup>

          <Button variant="outline" size="sm" onClick={onRemove}>
            <TrashIcon data-icon="inline-start" />
            Remove node
          </Button>
        </div>
      </div>
    </div>
  )
}
