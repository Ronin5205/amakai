"use client"

import * as React from "react"

import { Button } from "@amakai/shared/components/ui/button"
import { Input } from "@amakai/shared/components/ui/input"
import { cn } from "@amakai/shared/lib/utils"

export type ClarificationQuestion = {
  id: string
  question: string
  options?: Array<{ id: string; label: string }>
}

type ClarificationQuestionsProps = {
  questions: ClarificationQuestion[]
  disabled?: boolean
  onSubmit: (message: string) => void | Promise<void>
}

export function ClarificationQuestions({
  questions,
  disabled = false,
  onSubmit,
}: ClarificationQuestionsProps) {
  const [selections, setSelections] = React.useState<Record<string, string>>(
    {}
  )
  const [textAnswers, setTextAnswers] = React.useState<Record<string, string>>(
    {}
  )
  const [submitting, setSubmitting] = React.useState(false)

  const allAnswered = questions.every((question) => {
    const options = question.options ?? []
    if (options.length > 0) {
      return Boolean(selections[question.id])
    }
    return Boolean(textAnswers[question.id]?.trim())
  })

  const handleSubmit = async () => {
    if (!allAnswered || disabled || submitting) return

    const lines = questions.map((question) => {
      const options = question.options ?? []
      const answer =
        options.length > 0
          ? options.find((option) => option.id === selections[question.id])
              ?.label ?? selections[question.id]
          : textAnswers[question.id]?.trim() ?? ""
      return `${question.question} → ${answer}`
    })

    setSubmitting(true)
    try {
      await onSubmit(lines.join("\n"))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-4">
      {questions.map((question, index) => {
        const options = question.options ?? []
        const selectedId = selections[question.id]

        return (
          <div
            key={question.id}
            className="flex min-w-0 flex-col gap-2"
          >
            {questions.length > 1 ? (
              <p className="text-[11px] font-medium text-muted-foreground">
                Question {index + 1}
              </p>
            ) : null}

            <p className="text-pretty text-foreground leading-snug">
              {question.question}
            </p>

            {options.length > 0 ? (
              <div
                role="radiogroup"
                aria-label={question.question}
                className="flex flex-col gap-1.5"
              >
                {options.map((option) => {
                  const selected = selectedId === option.id
                  return (
                    <Button
                      key={option.id}
                      type="button"
                      variant={selected ? "secondary" : "outline"}
                      size="sm"
                      disabled={disabled || submitting}
                      aria-pressed={selected}
                      className={cn(
                        "h-auto min-w-0 w-full justify-start whitespace-normal px-3 py-2 text-left text-xs leading-snug",
                        selected && "ring-1 ring-ring"
                      )}
                      onClick={() =>
                        setSelections((current) => ({
                          ...current,
                          [question.id]: option.id,
                        }))
                      }
                    >
                      {option.label}
                    </Button>
                  )
                })}
              </div>
            ) : (
              <Input
                value={textAnswers[question.id] ?? ""}
                onChange={(event) =>
                  setTextAnswers((current) => ({
                    ...current,
                    [question.id]: event.target.value,
                  }))
                }
                disabled={disabled || submitting}
                placeholder="Your answer"
                className="h-8"
              />
            )}
          </div>
        )
      })}

      <Button
        type="button"
        size="sm"
        disabled={!allAnswered || disabled || submitting}
        onClick={() => void handleSubmit()}
        className="w-full sm:w-auto sm:self-start"
      >
        Submit answers
      </Button>
    </div>
  )
}
