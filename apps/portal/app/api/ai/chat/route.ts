import { NextResponse } from "next/server"
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai"

import { getChatModel, getChatModelId, requireGeminiApiKey } from "@/lib/ai/models"
import { buildSystemPrompt } from "@/lib/ai/system-prompt"
import { peekConfirmation } from "@/lib/ai/tools/confirmation"
import {
  executeConfirmedDestructiveAction,
  isConfirmationUserMessage,
} from "@/lib/ai/tools/execute-confirmed"
import { createAssistantTools } from "@/lib/ai/tools"
import {
  AiQuotaExhaustedError,
  assertAiQuota,
  recordAiUsage,
} from "@/lib/data/ai-usage"
import {
  appendAiMessage,
  getOrCreateAiThread,
  touchAiThreadTitle,
} from "@/lib/data/ai-threads"
import { createClient } from "@/utils/supabase/server"

export const runtime = "nodejs"
export const maxDuration = 60

type ChatRequestBody = {
  messages?: UIMessage[]
  threadId?: string | null
  confirmationToken?: string | null
  editor?: {
    workflowId?: string | null
    selectedNodeId?: string | null
    liveCanvas?: boolean
    nodeCount?: number
  } | null
}

function extractText(message: UIMessage | undefined): string {
  if (!message) return ""
  const maybeContent = (message as unknown as { content?: unknown }).content
  if (typeof maybeContent === "string") {
    return maybeContent
  }
  const parts = message.parts ?? []
  return parts
    .map((part) =>
      part.type === "text" && "text" in part ? String(part.text ?? "") : ""
    )
    .filter(Boolean)
    .join("\n")
}

export async function POST(request: Request) {
  try {
    requireGeminiApiKey()

    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as ChatRequestBody
    const messages = Array.isArray(body.messages) ? body.messages : []

    if (messages.length === 0) {
      return NextResponse.json({ error: "empty_messages" }, { status: 400 })
    }

    let quota
    try {
      quota = await assertAiQuota(user.id)
    } catch (error) {
      if (error instanceof AiQuotaExhaustedError) {
        return NextResponse.json(
          {
            error: "ai_quota_exhausted",
            quota: error.quota,
            upgradePath: "/admin/billing/pro",
          },
          { status: 402 }
        )
      }
      throw error
    }

    const lastUser = [...messages].reverse().find((message) => message.role === "user")
    const userText = extractText(lastUser)

    const thread = await getOrCreateAiThread({
      threadId: body.threadId,
      mode: "auto",
      title: userText.slice(0, 64) || "New chat",
    })

    if (userText) {
      await appendAiMessage({
        threadId: thread.id,
        role: "user",
        content: userText,
      })
      if (thread.title === "New chat") {
        await touchAiThreadTitle(thread.id, userText)
      }
    }

    const tools = createAssistantTools({
      userId: user.id,
      threadId: thread.id,
      confirmationToken: body.confirmationToken ?? null,
      editor: body.editor
        ? {
            workflowId: body.editor.workflowId ?? null,
            selectedNodeId: body.editor.selectedNodeId ?? null,
            liveCanvas: Boolean(body.editor.liveCanvas),
          }
        : null,
    })

    const confirmationToken = body.confirmationToken?.trim() ?? ""
    if (confirmationToken && isConfirmationUserMessage(userText)) {
      const actionResult = await executeConfirmedDestructiveAction({
        userId: user.id,
        confirmationToken,
      })

      const assistantText = actionResult.ok
        ? actionResult.summary
        : actionResult.error

      const result = streamText({
        model: getChatModel(),
        system:
          "You are Amakai Assistant. Report the action result to the user in one short paragraph.",
        prompt: assistantText,
        onFinish: async ({ usage }) => {
          await recordAiUsage({
            userId: user.id,
            kind: "chat",
            model: getChatModelId(),
            inputTokens: usage?.inputTokens ?? 0,
            outputTokens: usage?.outputTokens ?? 0,
            threadId: thread.id,
          }).catch(() => {})

          await appendAiMessage({
            threadId: thread.id,
            role: "assistant",
            content: assistantText,
          }).catch(() => {})
        },
      })

      return result.toUIMessageStreamResponse({
        headers: {
          "x-ai-thread-id": thread.id,
          "x-ai-quota-remaining-credits": String(
            Math.floor(quota.remainingCredits)
          ),
        },
      })
    }

    const pendingConfirmation = confirmationToken
      ? peekConfirmation(confirmationToken)
      : null

    const result = streamText({
      model: getChatModel(),
      system: [
        buildSystemPrompt({
          editorContext: body.editor
            ? {
                workflowId: body.editor.workflowId,
                selectedNodeId: body.editor.selectedNodeId,
                nodeCount: body.editor.nodeCount,
              }
            : null,
        }),
        pendingConfirmation
          ? `The user approved a pending ${pendingConfirmation.toolName} action. A confirmation token is available in your tool context — call ${pendingConfirmation.toolName} immediately with the same payload (${JSON.stringify(pendingConfirmation.payload)}). Do not request a new confirmation. Never reuse old confirmation ids from chat history.`
          : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      messages: await convertToModelMessages(messages),
      tools,
      stopWhen: stepCountIs(14),
      onFinish: async ({ text, usage }) => {
        const inputTokens = usage?.inputTokens ?? 0
        const outputTokens = usage?.outputTokens ?? 0

        await recordAiUsage({
          userId: user.id,
          kind: "chat",
          model: getChatModelId(),
          inputTokens,
          outputTokens,
          threadId: thread.id,
        }).catch(() => {})

        if (text?.trim()) {
          await appendAiMessage({
            threadId: thread.id,
            role: "assistant",
            content: text,
          }).catch(() => {})
        }
      },
    })

    return result.toUIMessageStreamResponse({
      headers: {
        "x-ai-thread-id": thread.id,
        "x-ai-quota-remaining-credits": String(
          Math.floor(quota.remainingCredits)
        ),
      },
    })
  } catch (error) {
    console.error("[ai/chat]", error)
    return NextResponse.json(
      {
        error: "ai_chat_failed",
        message:
          error instanceof Error ? error.message : "AI chat request failed.",
      },
      { status: 500 }
    )
  }
}
