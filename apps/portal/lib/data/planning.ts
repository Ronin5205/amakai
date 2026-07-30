import type {
  ClarificationQuestion,
  PlanningStage,
  RequirementAnalysis,
} from "@/lib/domain/planning"

const emptyAnalysis: RequirementAnalysis = {
  intent: "",
  domain: "",
  complexity: "low",
  objectives: [],
  missingInfo: [],
}

export async function getPlanningStages(): Promise<PlanningStage[]> {
  return []
}

export async function getSampleAnalysis(): Promise<RequirementAnalysis> {
  return emptyAnalysis
}

export async function getClarificationQuestions(): Promise<
  ClarificationQuestion[]
> {
  return []
}
