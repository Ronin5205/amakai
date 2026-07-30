export type PlanningStage = {
  order: number
  name: string
  description: string
  status: "pending" | "active" | "complete"
}

export type ClarificationQuestion = {
  id: string
  question: string
  answered?: boolean
}

export type RequirementAnalysis = {
  intent: string
  domain: string
  complexity: "low" | "medium" | "high"
  objectives: string[]
  missingInfo: string[]
}
