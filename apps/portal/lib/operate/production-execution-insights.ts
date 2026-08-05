import type { ExecutionLogDetail, ExecutionStepLog } from "@/lib/domain/operate"
import type { ExecutionLogGroup, LogEntry, LogLevel } from "@/lib/domain/monitoring"
import type { ExecutionStatus } from "@/lib/domain/execution"
import type {
  PlaygroundLogLevel,
  PlaygroundStep,
  PlaygroundStepType,
} from "@/lib/engine/types"

export type StoredProductionRunResult = {
  passed?: boolean
  steps?: PlaygroundStep[]
  pendingApproval?: unknown
  pendingWait?: unknown
  triggerInput?: Record<string, Record<string, unknown>> | null
}

export type ProductionExecutionRecord = {
  id: string
  workflowId: string
  workflowName: string
  status: ExecutionStatus
  trigger: string
  startedAt: string
  finishedAt?: string
  durationMs?: number
  errorMessage?: string
  triggerInput?: Record<string, Record<string, unknown>>
  result: StoredProductionRunResult | null
}

const STEP_TYPES_WITH_LOGS: PlaygroundStepType[] = [
  "start",
  "node_enter",
  "node_exit",
  "node_error",
  "edge_fire",
  "pending_approval",
  "pending_wait",
  "finish_pass",
  "finish_fail",
]

export function parseStoredProductionRunResult(
  value: unknown
): StoredProductionRunResult | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as StoredProductionRunResult

  return {
    ...record,
    steps: Array.isArray(record.steps) ? record.steps : [],
  }
}

export function getProductionRunSteps(
  record: ProductionExecutionRecord
): PlaygroundStep[] {
  return record.result?.steps ?? []
}

const TRIGGER_METADATA_KEYS = new Set([
  "playground",
  "triggeredAt",
  "triggerType",
])

export function extractTriggerInput(
  record: ProductionExecutionRecord
): Record<string, Record<string, unknown>> | undefined {
  if (record.result?.triggerInput) {
    return record.result.triggerInput
  }

  const steps = getProductionRunSteps(record)
  const triggerInputs: Record<string, Record<string, unknown>> = {}

  for (const step of steps) {
    if (
      step.type === "node_exit" &&
      step.nodeId &&
      step.outputPayload &&
      typeof step.outputPayload === "object"
    ) {
      triggerInputs[step.nodeId] = step.outputPayload as Record<string, unknown>
    }
  }

  return Object.keys(triggerInputs).length > 0 ? triggerInputs : undefined
}

function formatTriggerValue(value: unknown) {
  if (value === null || value === undefined) {
    return "—"
  }

  if (typeof value === "string") {
    return value
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value)
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function formatTriggerInputSummary(
  triggerInput: Record<string, Record<string, unknown>> | undefined
) {
  if (!triggerInput) {
    return "—"
  }

  const userEntries = Object.values(triggerInput).flatMap((payload) =>
    Object.entries(payload).filter(([key]) => !TRIGGER_METADATA_KEYS.has(key))
  )

  if (userEntries.length === 0) {
    return "Default payload"
  }

  if (userEntries.length === 1) {
    const [key, value] = userEntries[0]
    return `${key}: ${formatTriggerValue(value)}`
  }

  return userEntries
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${formatTriggerValue(value)}`)
    .join(" · ")
}

function mapPlaygroundLogLevel(level: PlaygroundLogLevel): LogLevel {
  switch (level) {
    case "warning":
      return "alert"
    case "error":
      return "error"
    case "success":
    case "info":
    default:
      return "log"
  }
}

function stepTimestampIso(step: PlaygroundStep, fallback: string) {
  if (typeof step.log.timestamp === "number" && Number.isFinite(step.log.timestamp)) {
    return new Date(step.log.timestamp).toISOString()
  }

  return fallback
}

export function buildLogEntriesFromExecution(
  record: ProductionExecutionRecord
): LogEntry[] {
  const steps = getProductionRunSteps(record)
  const entries: LogEntry[] = steps
    .filter((step) => STEP_TYPES_WITH_LOGS.includes(step.type))
    .map((step, index) => ({
      id: `${record.id}:${step.log.id ?? index}`,
      timestamp: stepTimestampIso(step, record.startedAt),
      level: mapPlaygroundLogLevel(step.log.level),
      workflowId: record.workflowId,
      workflowName: record.workflowName,
      executionId: record.id,
      message: step.log.message,
      component: step.log.nodeLabel ?? step.nodeId,
    }))

  if (record.errorMessage) {
    entries.push({
      id: `${record.id}:run-error`,
      timestamp: record.finishedAt ?? record.startedAt,
      level: "error",
      workflowId: record.workflowId,
      workflowName: record.workflowName,
      executionId: record.id,
      message: record.errorMessage,
      component: "workflow",
      title: "Production run failed",
    })
  }

  return entries
}

function stepStatusForNode(
  nodeId: string,
  steps: PlaygroundStep[]
): ExecutionStepLog["status"] {
  const nodeSteps = steps.filter((step) => step.nodeId === nodeId)

  if (
    nodeSteps.some(
      (step) =>
        step.type === "node_error" ||
        (step.type === "node_exit" && step.log.level === "error") ||
        step.type === "finish_fail"
    )
  ) {
    return "failed"
  }

  if (nodeSteps.some((step) => step.type === "node_exit")) {
    return "completed"
  }

  if (
    nodeSteps.some(
      (step) =>
        step.type === "node_enter" ||
        step.type === "pending_approval" ||
        step.type === "pending_wait"
    )
  ) {
    return "running"
  }

  return "skipped"
}

export function buildExecutionStepsFromProductionRun(
  record: ProductionExecutionRecord
): ExecutionStepLog[] {
  const steps = getProductionRunSteps(record)
  const nodeIds = [
    ...new Set(
      steps
        .map((step) => step.nodeId)
        .filter((nodeId): nodeId is string => Boolean(nodeId))
    ),
  ]

  return nodeIds.map((nodeId) => {
    const nodeSteps = steps.filter((step) => step.nodeId === nodeId)
    const enterStep = nodeSteps.find((step) => step.type === "node_enter")
    const lastStep = nodeSteps[nodeSteps.length - 1]
    const startedAt = enterStep
      ? stepTimestampIso(enterStep, record.startedAt)
      : record.startedAt

    let durationMs: number | undefined
    if (enterStep && lastStep) {
      const startMs = new Date(startedAt).getTime()
      const endMs = stepTimestampIso(lastStep, record.finishedAt ?? record.startedAt)
      const delta = new Date(endMs).getTime() - startMs
      durationMs = delta >= 0 ? delta : undefined
    }

    return {
      nodeId,
      nodeLabel:
        enterStep?.log.nodeLabel ??
        lastStep?.log.nodeLabel ??
        nodeId,
      status: stepStatusForNode(nodeId, steps),
      startedAt,
      durationMs,
      message: lastStep?.log.message,
    }
  })
}

export function buildExecutionLogDetailFromProductionRun(
  record: ProductionExecutionRecord
): ExecutionLogDetail {
  return {
    id: record.id,
    workflowId: record.workflowId,
    workflowName: record.workflowName,
    status: record.status,
    trigger: record.trigger,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    durationMs: record.durationMs,
    triggerInput: extractTriggerInput(record),
    steps: buildExecutionStepsFromProductionRun(record),
    logs: buildLogEntriesFromExecution(record),
  }
}

export function buildLogEntriesFromExecutions(
  records: ProductionExecutionRecord[]
): LogEntry[] {
  return records
    .flatMap((record) => buildLogEntriesFromExecution(record))
    .sort(
      (left, right) =>
        new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
    )
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  log: 0,
  alert: 1,
  error: 2,
}

function getWorstLogLevel(logs: LogEntry[]): LogLevel {
  return logs.reduce((worst, log) => {
    return LOG_LEVEL_PRIORITY[log.level] > LOG_LEVEL_PRIORITY[worst]
      ? log.level
      : worst
  }, "log" as LogLevel)
}

function summarizeExecutionLogs(
  record: ProductionExecutionRecord,
  logs: LogEntry[]
): string {
  const errorLog = logs.find((log) => log.level === "error")
  if (errorLog) {
    return errorLog.message
  }

  if (record.errorMessage) {
    return record.errorMessage
  }

  const alertLog = logs.find((log) => log.level === "alert")
  if (alertLog) {
    return alertLog.message
  }

  if (logs.length === 0) {
    return "No log lines recorded."
  }

  if (logs.length === 1) {
    return logs[0].message
  }

  return `${logs.length} log entries`
}

export function buildExecutionLogGroup(
  record: ProductionExecutionRecord
): ExecutionLogGroup {
  const logs = buildLogEntriesFromExecution(record)

  return {
    id: record.id,
    executionId: record.id,
    workflowId: record.workflowId,
    workflowName: record.workflowName,
    status: record.status,
    trigger: record.trigger,
    startedAt: record.startedAt,
    finishedAt: record.finishedAt,
    durationMs: record.durationMs,
    logCount: logs.length,
    level: getWorstLogLevel(logs),
    message: summarizeExecutionLogs(record, logs),
    logs,
  }
}

export function buildExecutionLogGroups(
  records: ProductionExecutionRecord[]
): ExecutionLogGroup[] {
  return records.map(buildExecutionLogGroup)
}

function countNodeStepEvents(
  records: ProductionExecutionRecord[],
  nodeId: string,
  types: PlaygroundStepType[]
) {
  return records.reduce((count, record) => {
    const steps = getProductionRunSteps(record)
    return (
      count +
      steps.filter((step) => step.nodeId === nodeId && types.includes(step.type))
        .length
    )
  }, 0)
}

function countNodeErrors(records: ProductionExecutionRecord[], nodeId: string) {
  return records.reduce((count, record) => {
    const steps = getProductionRunSteps(record)
    return (
      count +
      steps.filter(
        (step) =>
          step.nodeId === nodeId &&
          (step.type === "node_error" ||
            (step.type === "node_exit" && step.log.level === "error"))
      ).length
    )
  }, 0)
}

function latestNodeActivityAt(
  records: ProductionExecutionRecord[],
  nodeId: string
) {
  let latest = 0

  for (const record of records) {
    for (const step of getProductionRunSteps(record)) {
      if (step.nodeId !== nodeId) continue
      if (typeof step.log.timestamp === "number") {
        latest = Math.max(latest, step.log.timestamp)
      }
    }
  }

  return latest > 0 ? new Date(latest).toISOString() : records[0]?.startedAt
}

function average(values: number[]) {
  if (values.length === 0) return undefined
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function formatPercent(value: number) {
  return `${Math.round(value)}%`
}

function formatUsd(value: number) {
  return `$${value.toFixed(2)}`
}

export function buildNodeHealthFromExecutions(
  records: ProductionExecutionRecord[],
  nodes: Array<{ id: string; label: string; kind: string }>
) {
  const latestRecord = records[0]

  return nodes.map((node) => {
    const totalErrors = countNodeErrors(records, node.id)
    const latestErrors = latestRecord
      ? countNodeErrors([latestRecord], node.id)
      : 0

    let status: "healthy" | "degraded" | "down" = "healthy"
    if (latestErrors > 0) {
      status = "down"
    } else if (totalErrors > 0) {
      status = "degraded"
    }

    return {
      nodeId: node.id,
      label: node.label,
      kind: node.kind,
      status,
      lastCheckedAt:
        latestNodeActivityAt(records, node.id) ??
        latestRecord?.startedAt ??
        new Date().toISOString(),
    }
  })
}

export function getTriggerLatencyMs(
  records: ProductionExecutionRecord[],
  nodeId: string
) {
  const values = records.flatMap((record) => {
    const steps = getProductionRunSteps(record)
    const enter = steps.find(
      (step) => step.nodeId === nodeId && step.type === "node_enter"
    )
    const exit = steps.find(
      (step) => step.nodeId === nodeId && step.type === "node_exit"
    )

    if (!enter || !exit) return []
    const delta = exit.log.timestamp - enter.log.timestamp
    return delta >= 0 ? [delta] : []
  })

  return average(values)
}

export function getRuntimeMetrics(records: ProductionExecutionRecord[]) {
  const finished = records.filter(
    (record) => record.status === "completed" || record.status === "failed"
  )
  const completed = finished.filter((record) => record.status === "completed")
  const durations = finished
    .map((record) => record.durationMs)
    .filter((value): value is number => typeof value === "number")

  const successRate =
    finished.length > 0 ? (completed.length / finished.length) * 100 : undefined

  return {
    totalRuns: records.length,
    successRate,
    avgDurationMs: average(durations),
  }
}

export function getPendingApprovalCount(records: ProductionExecutionRecord[]) {
  return records.filter((record) => record.status === "pending_approval").length
}

export {
  countNodeStepEvents,
  formatPercent,
  formatUsd,
}
