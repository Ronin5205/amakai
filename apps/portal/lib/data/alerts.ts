import type { Alert } from "@/lib/domain/monitoring"
import { alertFixtures } from "./fixtures/alerts"

export async function listAlerts(): Promise<Alert[]> {
  return alertFixtures
}
