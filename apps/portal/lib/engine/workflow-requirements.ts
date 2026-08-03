import { getCatalogItemId } from "@/lib/design/component-variant-definitions"
import {
  describeApprovalTarget,
  getApprovalApproverType,
  type ApprovalApproverType,
} from "@/lib/design/approval-config"
import { parseOutputFieldDefs, type OutputFieldType } from "@/lib/design/output-fields"
import { formatWaitDuration, getWaitDurationMs } from "@/lib/design/wait-config"
import { findTriggerNodes } from "@/lib/engine/graph-index"
import type { Workflow, WorkflowNode } from "@/lib/domain/workflow"
import { asStringArray } from "@/lib/design/upstream-fields"

export type TriggerTestRequirement = {
  nodeId: string
  nodeLabel: string
  triggerType: string
  outputFields: Array<{ name: string; type: OutputFieldType }>
}

export type HumanInputTestRequirement = {
  nodeId: string
  nodeLabel: string
  type: "approval"
  approverType: ApprovalApproverType
  approverTarget: string
}

export type WaitTestRequirement = {
  nodeId: string
  nodeLabel: string
  durationMs: number
  durationLabel: string
}

export type WorkflowTestRequirements = {
  triggers: TriggerTestRequirement[]
  humanInputs: HumanInputTestRequirement[]
  waitSteps: WaitTestRequirement[]
}

function mapTriggerRequirement(node: WorkflowNode): TriggerTestRequirement {
  const catalogItemId = getCatalogItemId(node)
  const defs = parseOutputFieldDefs(node.config)

  let triggerType = String(node.config.triggerType ?? "manual")
  if (catalogItemId === "trigger.api" && typeof node.config.triggerMode === "string") {
    triggerType = node.config.triggerMode
  }
  if (catalogItemId === "trigger.external-tool") {
    triggerType = String(node.config.operation ?? "receive")
  }

  return {
    nodeId: node.id,
    nodeLabel: node.label,
    triggerType,
    outputFields:
      defs.length > 0
        ? defs
        : asStringArray(node.config.outputFields).map((name) => ({
            name,
            type: "string" as const,
          })),
  }
}

function mapApprovalRequirement(node: WorkflowNode): HumanInputTestRequirement {
  return {
    nodeId: node.id,
    nodeLabel: node.label,
    type: "approval",
    approverType: getApprovalApproverType(node.config),
    approverTarget: describeApprovalTarget(node),
  }
}

function mapWaitRequirement(node: WorkflowNode): WaitTestRequirement {
  const durationMs = getWaitDurationMs(node.config)

  return {
    nodeId: node.id,
    nodeLabel: node.label,
    durationMs,
    durationLabel: formatWaitDuration(durationMs),
  }
}

export function analyzeWorkflowTestRequirements(
  workflow: Workflow
): WorkflowTestRequirements {
  const triggers = findTriggerNodes(workflow.nodes).map(mapTriggerRequirement)
  const humanInputs = workflow.nodes
    .filter((node) => node.kind === "approval")
    .map(mapApprovalRequirement)
  const waitSteps = workflow.nodes
    .filter(
      (node) =>
        node.kind === "loop" && getCatalogItemId(node) === "loop.wait"
    )
    .map(mapWaitRequirement)

  return { triggers, humanInputs, waitSteps }
}
