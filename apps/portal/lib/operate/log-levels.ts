import type {
  ExecutionLogGroup,
  LogEntry,
  LogFilter,
  LogLevel,
} from "@/lib/domain/monitoring"

export const ALERT_LOG_LEVELS: LogLevel[] = ["warn", "error"]

export function isAlertLogLevel(level: LogLevel) {
  return ALERT_LOG_LEVELS.includes(level)
}

export function isAlertLog(log: LogEntry) {
  return isAlertLogLevel(log.level)
}

export function filterAlertLogs(logs: LogEntry[]) {
  return logs.filter(isAlertLog)
}

export function matchesLogGroupFilter(group: ExecutionLogGroup, filter: LogFilter) {
  if (filter === "all") {
    return true
  }

  if (filter === "alerts") {
    return isAlertLogLevel(group.level) || group.logs.some(isAlertLog)
  }

  return group.logs.some((log) => log.level === filter) || group.level === filter
}

export function getLogDisplayTitle(log: LogEntry) {
  if (log.title?.trim()) {
    return log.title.trim()
  }

  if (isAlertLogLevel(log.level)) {
    const firstSentence = log.message.split(/[.!?]/)[0]?.trim()
    if (firstSentence) {
      return firstSentence
    }
  }

  return log.message
}
