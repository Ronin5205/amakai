"use server"

import { revalidatePath } from "next/cache"

import {
  getProductionRunSummary,
  listProductionRuns,
  startProductionRun,
} from "@/lib/data/production-runs"
import type { ProductionRun, ProductionRunSummary } from "@/lib/domain/production"

export async function listProductionRunsAction(
  limit = 50
): Promise<ProductionRun[]> {
  return listProductionRuns(limit)
}

export async function getProductionRunSummaryAction(): Promise<ProductionRunSummary> {
  return getProductionRunSummary()
}

export type StartProductionRunResult =
  | { run: ProductionRun }
  | { error: string }

export async function startProductionRunAction(
  workflowId: string,
  triggerPayloads?: Record<string, Record<string, unknown>>
): Promise<StartProductionRunResult> {
  try {
    const run = await startProductionRun(workflowId, { triggerPayloads })

    revalidatePath("/")
    revalidatePath("/production/runs")
    revalidatePath("/production/history")
    revalidatePath("/operate/live-workflows")
    revalidatePath(`/operate/live-workflows/${workflowId}/executions`)
    revalidatePath(`/operate/live-workflows/${workflowId}/monitoring`)
    revalidatePath("/operate/logs")

    return { run }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to start production run.",
    }
  }
}
