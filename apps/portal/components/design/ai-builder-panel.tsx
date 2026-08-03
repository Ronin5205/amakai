"use client"

import * as React from "react"
import {
  CheckCircleIcon,
  MagicWandIcon,
  PlayIcon,
  QuestionIcon,
  SparkleIcon,
} from "@phosphor-icons/react"

import { StageList } from "@/components/portal/stage-list"
import { StatusBadge } from "@/components/portal/status-badge"
import type {
  ClarificationQuestion,
  PlanningStage,
  RequirementAnalysis,
} from "@/lib/domain/planning"
import { Badge } from "@amakai/shared/components/ui/badge"
import { Button } from "@amakai/shared/components/ui/button"
import { Field, FieldLabel } from "@amakai/shared/components/ui/field"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@amakai/shared/components/ui/item"
import { ScrollArea } from "@amakai/shared/components/ui/scroll-area"
import { Textarea } from "@amakai/shared/components/ui/textarea"

export interface AiBuilderPanelProps {
  analysis: RequirementAnalysis
  stages: PlanningStage[]
  questions: ClarificationQuestion[]
  onGenerate: (request: string) => void
}

const SAMPLE_REQUEST =
  "Build an expense report automation that validates submissions against company policy, routes reports through manager and finance approval based on amount thresholds, and processes reimbursements through our payroll system."

function complexityLabel(complexity: RequirementAnalysis["complexity"]) {
  return complexity.charAt(0).toUpperCase() + complexity.slice(1)
}

export function AiBuilderPanel({
  analysis,
  stages,
  questions,
  onGenerate,
}: AiBuilderPanelProps) {
  const [request, setRequest] = React.useState("")
  const hasRequest = request.trim().length > 0

  return (
    <ScrollArea className="h-full max-h-[calc(100dvh-8rem)]">
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <SparkleIcon className="size-4 text-primary" />
            <h3 className="text-sm font-medium">AI Builder</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Describe your automation and generate a draft workflow directly on
            the canvas — no manual setup required.
          </p>
        </div>

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

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={!hasRequest}>
            <MagicWandIcon data-icon="inline-start" />
            Analyze
          </Button>
          <Button
            size="sm"
            disabled={!hasRequest}
            onClick={() => onGenerate(request)}
          >
            <PlayIcon data-icon="inline-start" />
            Generate workflow
          </Button>
        </div>

        {analysis.intent ? (
          <div className="flex flex-col gap-3 rounded-none border p-3">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                Intent
              </span>
              <p className="text-xs/relaxed">{analysis.intent}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{analysis.domain}</Badge>
              <StatusBadge
                status={analysis.complexity}
                label={complexityLabel(analysis.complexity)}
              />
            </div>
          </div>
        ) : null}

        {questions.length > 0 ? (
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
        ) : null}

        {stages.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-medium">Planning pipeline</h4>
            <StageList
              stages={stages.map((stage) => ({
                order: stage.order,
                name: stage.name,
                description: stage.description,
                status: stage.status,
              }))}
            />
          </div>
        ) : null}
      </div>
    </ScrollArea>
  )
}
