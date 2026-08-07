import { tool } from "ai"
import { z } from "zod"
import { randomUUID } from "node:crypto"

export function createPlanningTools() {
  return {
    ask_clarification: tool({
      description:
        "Ask the user clarifying questions before creating tables or workflows. Required before propose_build_plan.",
      inputSchema: z.object({
        questions: z
          .array(
            z.object({
              id: z.string().min(1),
              question: z.string().min(1).max(400),
              options: z
                .array(
                  z.object({
                    id: z.string().min(1),
                    label: z.string().min(1).max(120),
                  })
                )
                .optional(),
            })
          )
          .min(1)
          .max(6),
      }),
      execute: async ({ questions }) => {
        return {
          kind: "clarification" as const,
          questions,
        }
      },
    }),

    propose_build_plan: tool({
      description:
        "Propose a build plan for the user to approve before executing write tools.",
      inputSchema: z.object({
        title: z.string().min(1).max(120),
        summary: z.string().min(1).max(800),
        steps: z
          .array(
            z.object({
              id: z.string().min(1),
              title: z.string().min(1).max(120),
              detail: z.string().min(1).max(400),
            })
          )
          .min(1)
          .max(12),
      }),
      execute: async ({ title, summary, steps }) => {
        return {
          kind: "build_plan" as const,
          plan: {
            id: randomUUID(),
            title,
            summary,
            steps,
            requiresApproval: true as const,
          },
        }
      },
    }),
  }
}
