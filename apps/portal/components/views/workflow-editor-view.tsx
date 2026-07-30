"use client"

import * as React from "react"
import {
  FloppyDiskIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react"

import { StageList } from "@/components/portal/stage-list"
import { StatusBadge } from "@/components/portal/status-badge"
import { SectionPage } from "@/components/section-page"
import type { ValidationCheck, ValidationStage } from "@/lib/domain/validation"
import type { NodeConfig, Workflow, WorkflowNode } from "@/lib/domain/workflow"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@amakai/shared/components/ui/alert"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@amakai/shared/components/ui/card"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@amakai/shared/components/ui/item"
import { cn } from "@amakai/shared/lib/utils"

export interface WorkflowEditorViewProps {
  workflow: Workflow
  validationStages: ValidationStage[]
  validationChecks: ValidationCheck[]
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

function hasValidationIssues(checks: ValidationCheck[]) {
  return checks.some(
    (check) => check.severity === "error" || check.severity === "warning"
  )
}

export function WorkflowEditorView({
  workflow,
  validationStages,
  validationChecks,
}: WorkflowEditorViewProps) {
  const [selectedNodeId, setSelectedNodeId] = React.useState(
    workflow.nodes[0]?.id ?? ""
  )

  const selectedNode =
    workflow.nodes.find((node) => node.id === selectedNodeId) ?? workflow.nodes[0]

  const issueChecks = validationChecks.filter(
    (check) => check.severity === "error" || check.severity === "warning"
  )

  return (
    <SectionPage
      eyebrow="Design"
      title="Workflow Editor"
      description={`Editing draft workflow — ${workflow.name}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <FloppyDiskIcon data-icon="inline-start" />
            Save
          </Button>
          <Button variant="outline" size="sm" disabled>
            <ShieldCheckIcon data-icon="inline-start" />
            Validate
          </Button>
          <Button size="sm" disabled>
            <RocketLaunchIcon data-icon="inline-start" />
            Deploy
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <Card>
            <CardHeader>
              <CardTitle>Node outline</CardTitle>
            </CardHeader>
            <CardContent>
              <ItemGroup>
                {workflow.nodes.map((node: WorkflowNode) => (
                  <Item
                    key={node.id}
                    variant="outline"
                    className={cn(
                      "cursor-pointer",
                      selectedNode?.id === node.id && "border-primary/40 bg-muted/30"
                    )}
                    onClick={() => setSelectedNodeId(node.id)}
                  >
                    <ItemContent>
                      <ItemTitle className="flex flex-wrap items-center gap-2">
                        {node.label}
                        <StatusBadge status={node.kind} label={node.kind} />
                      </ItemTitle>
                      <ItemDescription>{node.id}</ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {selectedNode ? `${selectedNode.label} configuration` : "Node configuration"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <ItemGroup>
                  {configEntries(selectedNode.config).length > 0 ? (
                    configEntries(selectedNode.config).map((entry) => (
                      <Item key={entry.key} variant="muted">
                        <ItemContent>
                          <ItemTitle>{entry.key}</ItemTitle>
                          <ItemDescription className="whitespace-pre-wrap font-mono">
                            {formatConfigValue(entry.value)}
                          </ItemDescription>
                        </ItemContent>
                      </Item>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No configuration fields set for this node.
                    </p>
                  )}
                </ItemGroup>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Select a node to view its configuration.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {hasValidationIssues(validationChecks) ? (
          <Alert variant="destructive">
            <ShieldCheckIcon />
            <AlertTitle>Validation issues found</AlertTitle>
            <AlertDescription>
              <ul className="flex list-disc flex-col gap-1 ps-4">
                {issueChecks.map((check) => (
                  <li key={check.id}>
                    <span className="font-medium">{check.stage}:</span> {check.message}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <ShieldCheckIcon />
            <AlertTitle>Validation passed</AlertTitle>
            <AlertDescription>
              All configured checks passed. Review stages below before deployment.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Validation stages</h2>
          <StageList
            stages={validationStages.map((stage) => ({
              order: stage.order,
              name: stage.name,
              status: stage.status,
            }))}
          />
        </div>
      </div>
    </SectionPage>
  )
}
