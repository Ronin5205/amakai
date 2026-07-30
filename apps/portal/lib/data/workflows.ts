import type { Workflow } from "@/lib/domain/workflow"
import { workflowDraftFixture, workflowFixtures } from "./fixtures/workflows"

export async function listWorkflows(): Promise<Workflow[]> {
  return workflowFixtures
}

export async function getWorkflowDraft(): Promise<Workflow> {
  return workflowDraftFixture
}
