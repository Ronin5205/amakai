import type { WorkflowTemplate } from "@/lib/domain/template"
import { templateFixtures } from "./fixtures/templates"

export async function listTemplates(): Promise<WorkflowTemplate[]> {
  return templateFixtures
}
