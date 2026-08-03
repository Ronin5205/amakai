import type {
  WorkflowMetricSection,
  WorkflowMonitoringSnapshot,
} from "@/lib/domain/operate"
import type { LiveWorkflowDetail } from "@/lib/domain/deployment"
import type { WorkflowNode } from "@/lib/domain/workflow"
import {
  buildNodeHealthFromExecutions,
  countNodeStepEvents,
  formatPercent,
  getPendingApprovalCount,
  getRuntimeMetrics,
  getTriggerLatencyMs,
  type ProductionExecutionRecord,
} from "@/lib/operate/production-execution-insights"

function getCatalogItemId(node: WorkflowNode) {
  const catalogItemId = node.config?.catalogItemId
  return typeof catalogItemId === "string" ? catalogItemId : null
}

function isAiNode(node: WorkflowNode) {
  const catalogItemId = getCatalogItemId(node)
  return (
    Boolean(node.config?.aiModel) ||
    catalogItemId?.startsWith("ai.") === true ||
    node.kind === "sequential" &&
      typeof node.config?.promptTemplate === "string"
  )
}

function isIntegrationNode(node: WorkflowNode) {
  const catalogItemId = getCatalogItemId(node)
  return (
    catalogItemId?.startsWith("integrations.") === true ||
    Boolean(node.config?.apiEndpoint)
  )
}

function getTriggerType(node: WorkflowNode) {
  const triggerType = node.config?.triggerType
  return typeof triggerType === "string" ? triggerType : "manual"
}

function metric(
  label: string,
  value: string | number,
  unit?: string,
  percentage?: number
) {
  return { label, value, unit, percentage }
}

function buildTriggerSection(
  nodes: WorkflowNode[],
  executions: ProductionExecutionRecord[]
): WorkflowMetricSection | null {
  const triggers = nodes.filter((node) => node.kind === "trigger")
  if (triggers.length === 0) return null

  return {
    id: "triggers",
    title: "Trigger activity",
    description: "Invocations and intake latency for workflow entry points.",
    metrics: triggers.flatMap((node) => {
      const triggerType = getTriggerType(node)
      const invocations = executions.length
      const latencyMs = getTriggerLatencyMs(executions, node.id)

      return [
        metric(`${node.label} invocations`, invocations),
        metric(
          `${node.label} ${triggerType} latency`,
          latencyMs ?? "—",
          "ms"
        ),
      ]
    }),
  }
}

function buildAiSection(
  nodes: WorkflowNode[],
  executions: ProductionExecutionRecord[]
): WorkflowMetricSection | null {
  const aiNodes = nodes.filter(isAiNode)
  if (aiNodes.length === 0) return null

  return {
    id: "ai",
    title: "AI usage",
    description: "Token consumption, model latency, and estimated cost.",
    metrics: aiNodes.flatMap((node) => {
      const model =
        typeof node.config?.aiModel === "string" ? node.config.aiModel : "default"
      const requests = countNodeStepEvents(executions, node.id, ["node_exit"])

      return [
        metric(`${node.label} requests`, requests),
        metric(`${node.label} tokens`, 0),
        metric(`${node.label} (${model}) latency`, "—", "ms"),
        metric(`${node.label} estimated cost`, "$0.00"),
      ]
    }),
  }
}

function buildCodeSection(
  nodes: WorkflowNode[],
  executions: ProductionExecutionRecord[]
): WorkflowMetricSection | null {
  const codeNodes = nodes.filter(
    (node) => getCatalogItemId(node) === "action.code"
  )
  if (codeNodes.length === 0) return null

  return {
    id: "code",
    title: "Code execution",
    description: "Memory and runtime for custom code steps.",
    metrics: codeNodes.flatMap((node) => {
      const runs = countNodeStepEvents(executions, node.id, ["node_exit"])

      return [
        metric(`${node.label} runs`, runs),
        metric(`${node.label} runtime`, "—", "ms"),
      ]
    }),
  }
}

function buildParallelSection(
  nodes: WorkflowNode[],
  executions: ProductionExecutionRecord[]
): WorkflowMetricSection | null {
  const parallelNodes = nodes.filter((node) => node.kind === "parallel")
  if (parallelNodes.length === 0) return null

  return {
    id: "parallel",
    title: "Parallel branches",
    description: "Concurrency and branch throughput.",
    metrics: parallelNodes.flatMap((node) => {
      const branchEvents = countNodeStepEvents(executions, node.id, [
        "node_enter",
        "node_exit",
      ])

      return [
        metric(`${node.label} branch events`, branchEvents),
        metric(
          `${node.label} max concurrency`,
          typeof node.config?.maxConcurrency === "number"
            ? node.config.maxConcurrency
            : 0
        ),
      ]
    }),
  }
}

function buildApprovalSection(
  nodes: WorkflowNode[],
  executions: ProductionExecutionRecord[]
): WorkflowMetricSection | null {
  const approvalNodes = nodes.filter((node) => node.kind === "approval")
  if (approvalNodes.length === 0) return null

  const pending = getPendingApprovalCount(executions)

  return {
    id: "approvals",
    title: "Human-in-the-loop",
    description: "Pending reviews and approval wait times.",
    metrics: approvalNodes.flatMap((node) => [
      metric(`${node.label} pending`, pending),
      metric(`${node.label} avg wait`, "—", "min"),
    ]),
  }
}

function buildLoopSection(
  nodes: WorkflowNode[],
  executions: ProductionExecutionRecord[]
): WorkflowMetricSection | null {
  const loopNodes = nodes.filter((node) => node.kind === "loop")
  if (loopNodes.length === 0) return null

  return {
    id: "loops",
    title: "Loop processing",
    description: "Iterations and items processed per loop node.",
    metrics: loopNodes.flatMap((node) => {
      const iterations = countNodeStepEvents(executions, node.id, ["node_exit"])

      return [
        metric(`${node.label} iterations`, iterations),
        metric(`${node.label} items processed`, iterations),
      ]
    }),
  }
}

function buildIntegrationSection(
  nodes: WorkflowNode[],
  executions: ProductionExecutionRecord[]
): WorkflowMetricSection | null {
  const integrationNodes = nodes.filter(isIntegrationNode)
  if (integrationNodes.length === 0) return null

  return {
    id: "integrations",
    title: "Integrations",
    description: "External API calls, error rates, and connector health.",
    metrics: integrationNodes.flatMap((node) => {
      const apiCalls = countNodeStepEvents(executions, node.id, ["node_exit"])
      const errors = countNodeStepEvents(executions, node.id, ["node_error"])
      const errorRate =
        apiCalls > 0 ? formatPercent((errors / apiCalls) * 100) : "0%"

      return [
        metric(`${node.label} API calls`, apiCalls),
        metric(`${node.label} error rate`, errorRate),
        metric(`${node.label} latency`, "—", "ms"),
      ]
    }),
  }
}

function buildDataTableSection(
  nodes: WorkflowNode[],
  executions: ProductionExecutionRecord[]
): WorkflowMetricSection | null {
  const tableNodes = nodes.filter(
    (node) => getCatalogItemId(node) === "action.data-table"
  )
  if (tableNodes.length === 0) return null

  return {
    id: "data-tables",
    title: "Data tables",
    description: "Rows read and written by table operations.",
    metrics: tableNodes.flatMap((node) => {
      const operations = countNodeStepEvents(executions, node.id, ["node_exit"])

      return [
        metric(`${node.label} operations`, operations),
        metric(`${node.label} rows written`, 0),
      ]
    }),
  }
}

function buildRuntimeSection(
  nodes: WorkflowNode[],
  executions: ProductionExecutionRecord[]
): WorkflowMetricSection {
  const runtime = getRuntimeMetrics(executions)

  return {
    id: "runtime",
    title: "Workflow runtime",
    description: "Aggregate resource usage for this live workflow.",
    metrics: [
      metric("Production runs", runtime.totalRuns),
      metric(
        "Success rate",
        runtime.successRate !== undefined
          ? formatPercent(runtime.successRate)
          : "—"
      ),
      metric("Avg duration", runtime.avgDurationMs ?? "—", "ms"),
      metric("Active nodes", nodes.length),
    ],
  }
}

export function buildWorkflowMonitoringSnapshot(
  workflow: LiveWorkflowDetail,
  executions: ProductionExecutionRecord[] = []
): WorkflowMonitoringSnapshot {
  const nodes = workflow.nodes
  const sections = [
    buildTriggerSection(nodes, executions),
    buildRuntimeSection(nodes, executions),
    buildAiSection(nodes, executions),
    buildCodeSection(nodes, executions),
    buildParallelSection(nodes, executions),
    buildApprovalSection(nodes, executions),
    buildLoopSection(nodes, executions),
    buildIntegrationSection(nodes, executions),
    buildDataTableSection(nodes, executions),
  ].filter((section): section is WorkflowMetricSection => section !== null)

  return {
    workflowId: workflow.id,
    workflowName: workflow.name,
    sections,
    nodeHealth: buildNodeHealthFromExecutions(
      executions,
      nodes.map((node) => ({
        id: node.id,
        label: node.label,
        kind: node.kind,
      }))
    ),
  }
}
