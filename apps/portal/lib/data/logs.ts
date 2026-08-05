import {
  buildExecutionLogDetailFromProductionRun,
  buildExecutionLogGroups,
} from "@/lib/operate/production-execution-insights"
import { isAlertLog, isAlertLogLevel } from "@/lib/operate/log-levels"
import {
  getProductionExecutionRecord,
  listProductionExecutionRecords,
} from "@/lib/data/production-runs"
import type { ExecutionLogDetail } from "@/lib/domain/operate"
import type { ExecutionLogGroup, LogEntry } from "@/lib/domain/monitoring"

export async function listExecutionLogGroups(): Promise<ExecutionLogGroup[]> {
  const records = await listProductionExecutionRecords({ limit: 200 })
  return buildExecutionLogGroups(records)
}

export async function listLogs(): Promise<LogEntry[]> {
  const groups = await listExecutionLogGroups()
  return groups.flatMap((group) => group.logs)
}

export async function listAlertLogGroups(): Promise<ExecutionLogGroup[]> {
  const groups = await listExecutionLogGroups()

  return groups.filter(
    (group) => isAlertLogLevel(group.level) || group.logs.some(isAlertLog)
  )
}

export async function listAlertLogs(): Promise<LogEntry[]> {
  const groups = await listAlertLogGroups()

  return groups.map((group) => ({
    id: group.executionId,
    timestamp: group.startedAt,
    level: group.level,
    workflowId: group.workflowId,
    workflowName: group.workflowName,
    executionId: group.executionId,
    message: group.message,
    title: group.message,
  }))
}

export { isAlertLog }

export async function getExecutionLogDetail(
  executionId: string
): Promise<ExecutionLogDetail | null> {
  const record = await getProductionExecutionRecord(executionId)
  if (!record) {
    return null
  }

  return buildExecutionLogDetailFromProductionRun(record)
}
