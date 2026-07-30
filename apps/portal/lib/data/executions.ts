import type { Execution, ExecutionSummary } from "@/lib/domain/execution"
import {
  executionFixtures,
  executionSummaryFixture,
} from "./fixtures/executions"

export async function listExecutions(): Promise<Execution[]> {
  return executionFixtures
}

export async function getExecutionSummary(): Promise<ExecutionSummary> {
  return executionSummaryFixture
}
