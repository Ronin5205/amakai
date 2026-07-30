"use client"

import * as React from "react"
import {
  CheckCircleIcon,
  MagicWandIcon,
  PlayIcon,
  QuestionIcon,
} from "@phosphor-icons/react"

import { StageList } from "@/components/portal/stage-list"
import { StatusBadge } from "@/components/portal/status-badge"
import { SectionPage } from "@/components/section-page"
import type {
  ClarificationQuestion,
  PlanningStage,
  RequirementAnalysis,
} from "@/lib/domain/planning"
import { Badge } from "@amakai/shared/components/ui/badge"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@amakai/shared/components/ui/card"
import { Field, FieldLabel } from "@amakai/shared/components/ui/field"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@amakai/shared/components/ui/item"
import { Textarea } from "@amakai/shared/components/ui/textarea"

export interface AiBuilderViewProps {
  analysis: RequirementAnalysis
  stages: PlanningStage[]
  questions: ClarificationQuestion[]
}

const SAMPLE_REQUEST =
  "Build an expense report automation that validates submissions against company policy, routes reports through manager and finance approval based on amount thresholds, and processes reimbursements through our payroll system."

function complexityLabel(complexity: RequirementAnalysis["complexity"]) {
  return complexity.charAt(0).toUpperCase() + complexity.slice(1)
}

export function AiBuilderView({
  analysis,
  stages,
  questions,
}: AiBuilderViewProps) {
  const [request, setRequest] = React.useState("")

  return (
    <SectionPage
      eyebrow="Design"
      title="AI Builder"
      description="Describe your automation in natural language. The planning engine analyzes intent, extracts requirements, and assembles a workflow pipeline."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <MagicWandIcon data-icon="inline-start" />
            Analyze
          </Button>
          <Button size="sm" disabled>
            <PlayIcon data-icon="inline-start" />
            Generate workflow
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Automation request</CardTitle>
          </CardHeader>
          <CardContent>
            <Field>
              <FieldLabel htmlFor="automation-request">
                Describe what you want to automate
              </FieldLabel>
              <Textarea
                id="automation-request"
                placeholder={SAMPLE_REQUEST}
                value={request}
                onChange={(event) => setRequest(event.target.value)}
                rows={5}
              />
            </Field>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Requirement analysis</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground">
                  Intent
                </span>
                <p className="text-xs/relaxed">{analysis.intent}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Domain
                </span>
                <Badge variant="outline">{analysis.domain}</Badge>
                <span className="text-xs font-medium text-muted-foreground">
                  Complexity
                </span>
                <StatusBadge
                  status={analysis.complexity}
                  label={complexityLabel(analysis.complexity)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Objectives
                </span>
                <ul className="flex list-disc flex-col gap-1 ps-4 text-xs/relaxed">
                  {analysis.objectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  Missing information
                </span>
                <ul className="flex list-disc flex-col gap-1 ps-4 text-xs/relaxed text-muted-foreground">
                  {analysis.missingInfo.map((info) => (
                    <li key={info}>{info}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Clarification questions</CardTitle>
            </CardHeader>
            <CardContent>
              <ItemGroup>
                {questions.map((question) => (
                  <Item key={question.id} variant="outline">
                    <ItemMedia variant="icon">
                      {question.answered ? (
                        <CheckCircleIcon className="text-primary" weight="fill" />
                      ) : (
                        <QuestionIcon />
                      )}
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{question.question}</ItemTitle>
                      <ItemDescription>
                        {question.answered ? "Answered" : "Awaiting response"}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Planning pipeline</h2>
          <StageList
            stages={stages.map((stage) => ({
              order: stage.order,
              name: stage.name,
              description: stage.description,
              status: stage.status,
            }))}
          />
        </div>
      </div>
    </SectionPage>
  )
}
