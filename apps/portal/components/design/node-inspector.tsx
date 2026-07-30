"use client"

import * as React from "react"
import { TrashIcon } from "@phosphor-icons/react"

import { StatusBadge } from "@/components/portal/status-badge"
import type { NodeConfig, WorkflowNode } from "@/lib/domain/workflow"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@amakai/shared/components/ui/field"
import { Input } from "@amakai/shared/components/ui/input"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@amakai/shared/components/ui/item"
import { ScrollArea } from "@amakai/shared/components/ui/scroll-area"
import { Separator } from "@amakai/shared/components/ui/separator"

export interface NodeInspectorProps {
  node: WorkflowNode | null
  selectedCount: number
  onLabelChange: (label: string) => void
  onRemove: () => void
}

function formatConfigValue(value: unknown) {
  if (value === undefined || value === null) {
    return "—"
  }

  if (typeof value === "object") {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

function configEntries(config: NodeConfig) {
  const entries: Array<{ key: string; value: unknown }> = [
    { key: "apiEndpoint", value: config.apiEndpoint },
    { key: "authMethod", value: config.authMethod },
    { key: "retryCount", value: config.retryCount },
    { key: "timeoutMs", value: config.timeoutMs },
    { key: "rateLimit", value: config.rateLimit },
    { key: "aiModel", value: config.aiModel },
    { key: "promptTemplate", value: config.promptTemplate },
    { key: "inputMapping", value: config.inputMapping },
    { key: "outputMapping", value: config.outputMapping },
  ]

  return entries.filter(
    (entry) => entry.value !== undefined && entry.value !== null
  )
}

export function NodeInspector({
  node,
  selectedCount,
  onLabelChange,
  onRemove,
}: NodeInspectorProps) {
  if (selectedCount > 1) {
    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">Node inspector</h2>
          <p className="text-xs text-muted-foreground">
            {selectedCount} nodes selected
          </p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
          <p className="text-xs text-muted-foreground">
            Select a single node to edit its configuration, or use the canvas
            toolbar to copy, duplicate, or delete the selection.
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
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="border-b px-4 py-3">
          <h2 className="text-sm font-medium">Node inspector</h2>
          <p className="text-xs text-muted-foreground">
            Select a node on the canvas to inspect or edit it.
          </p>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-muted-foreground">
          No node selected
        </div>
      </div>
    )
  }

  const entries = configEntries(node.config)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-medium">Node inspector</h2>
        <p className="text-xs text-muted-foreground">
          Adjust labels and review configuration for the selected step.
        </p>
      </div>

      <ScrollArea className="min-h-0 flex-1">
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
          </FieldGroup>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={node.kind} label={node.kind} />
            <span className="text-xs text-muted-foreground">{node.id}</span>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium">Configuration</h3>
            {entries.length > 0 ? (
              <ItemGroup>
                {entries.map((entry) => (
                  <Item key={entry.key} variant="muted">
                    <ItemContent>
                      <ItemTitle>{entry.key}</ItemTitle>
                      <ItemDescription className="whitespace-pre-wrap font-mono">
                        {formatConfigValue(entry.value)}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
            ) : (
              <p className="text-xs text-muted-foreground">
                No configuration fields set for this node.
              </p>
            )}
          </div>

          <Button variant="outline" size="sm" onClick={onRemove}>
            <TrashIcon data-icon="inline-start" />
            Remove node
          </Button>
        </div>
      </ScrollArea>
    </div>
  )
}
