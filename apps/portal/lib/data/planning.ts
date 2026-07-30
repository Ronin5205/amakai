import type {
  ClarificationQuestion,
  PlanningStage,
  RequirementAnalysis,
} from "@/lib/domain/planning"
import {
  clarificationQuestionFixtures,
  planningStageFixtures,
  sampleAnalysisFixture,
} from "./fixtures/planning"

export async function getPlanningStages(): Promise<PlanningStage[]> {
  return planningStageFixtures
}

export async function getSampleAnalysis(): Promise<RequirementAnalysis> {
  return sampleAnalysisFixture
}

export async function getClarificationQuestions(): Promise<
  ClarificationQuestion[]
> {
  return clarificationQuestionFixtures
}
