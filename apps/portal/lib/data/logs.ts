import type { LogEntry } from "@/lib/domain/monitoring"
import { logFixtures } from "./fixtures/logs"

export async function listLogs(): Promise<LogEntry[]> {
  return logFixtures
}
