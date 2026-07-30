import type { Metadata } from "next"

import { AiBuilderView } from "@/components/views/ai-builder-view"
import {
  getClarificationQuestions,
  getPlanningStages,
  getSampleAnalysis,
} from "@/lib/data/planning"

export const metadata: Metadata = {
  title: "AI Builder",
}

export default async function AiBuilderPage() {
  const [analysis, stages, questions] = await Promise.all([
    getSampleAnalysis(),
    getPlanningStages(),
    getClarificationQuestions(),
  ])

  return (
    <AiBuilderView
      analysis={analysis}
      stages={stages}
      questions={questions}
    />
  )
}
