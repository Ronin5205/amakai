"use server"

import { getExecutionLogDetail, listAlertLogGroups, listExecutionLogGroups } from "@/lib/data/logs"
import type { ExecutionLogDetail } from "@/lib/domain/operate"
import type { ExecutionLogGroup, LogEntry } from "@/lib/domain/monitoring"

export async function listExecutionLogGroupsAction(): Promise<ExecutionLogGroup[]> {
  return listExecutionLogGroups()
}

export async function listLogsAction(): Promise<LogEntry[]> {
  const groups = await listExecutionLogGroups()
  return groups.flatMap((group) => group.logs)
}

export async function listAlertLogGroupsAction(): Promise<ExecutionLogGroup[]> {
  return listAlertLogGroups()
}

export async function getExecutionDetailAction(
  executionId: string
): Promise<ExecutionLogDetail | null> {
  return getExecutionLogDetail(executionId)
}
