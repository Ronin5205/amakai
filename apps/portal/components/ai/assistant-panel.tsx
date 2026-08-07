"use client"

import * as React from "react"
import Link from "next/link"
import {
  DefaultChatTransport,
  type UIMessage,
} from "ai"
import { useChat } from "@ai-sdk/react"
import {
  ArrowUpIcon,
  CheckIcon,
  CircleNotchIcon,
  ClockCounterClockwiseIcon,
  PlusIcon,
  SparkleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import { useAssistant } from "@/components/ai/assistant-provider"
import {
  AssistantStreamCursor,
  AssistantTypingIndicator,
} from "@/components/ai/assistant-typing"
import { useWorkflowEditorContext } from "@/components/ai/workflow-editor-context"
import {
  getAiThreadMessagesAction,
  listAiThreadsAction,
} from "@/lib/actions/ai-actions"
import type { AiStoredMessage, AiThreadSummary } from "@/lib/domain/ai"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@amakai/shared/components/ui/sheet"
import { Textarea } from "@amakai/shared/components/ui/textarea"
import { cn } from "@amakai/shared/lib/utils"

function messageText(message: UIMessage): string {
  if (!message.parts?.length) return ""
  return message.parts
    .map((part) =>
      part.type === "text" && "text" in part ? String(part.text ?? "") : ""
    )
    .filter(Boolean)
    .join("\n")
}

function storedToUiMessage(message: AiStoredMessage): UIMessage {
  return {
    id: message.id,
    role: message.role === "assistant" ? "assistant" : "user",
    parts: [{ type: "text", text: message.content }],
  }
}

function formatThreadTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const now = new Date()
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (sameDay) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })
  }
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })
}

function extractToolCards(message: UIMessage) {
  const cards: Array<{
    key: string
    kind: "tool" | "clarification" | "plan" | "confirm" | "live_patch"
    title: string
    body?: string
    data?: Record<string, unknown>
  }> = []

  for (const part of message.parts ?? []) {
    if (!part.type.startsWith("tool-") && part.type !== "dynamic-tool") {
      continue
    }

    const toolName =
      "toolName" in part
        ? String(part.toolName)
        : part.type.replace(/^tool-/, "")
    const output =
      "output" in part && part.output && typeof part.output === "object"
        ? (part.output as Record<string, unknown>)
        : null

    if (output?.kind === "clarification" && Array.isArray(output.questions)) {
      cards.push({
        key: `${message.id}-clarification`,
        kind: "clarification",
        title: "Clarifying questions",
        data: { questions: output.questions },
      })
      continue
    }

    if (output?.kind === "build_plan" && output.plan) {
      cards.push({
        key: `${message.id}-plan`,
        kind: "plan",
        title: "Build plan",
        data: { plan: output.plan as Record<string, unknown> },
      })
      continue
    }

    if (output?.requiresConfirmation) {
      cards.push({
        key: `${message.id}-confirm-${toolName}`,
        kind: "confirm",
        title: "Confirmation required",
        body: String(output.summary ?? toolName),
        data: {
          confirmationId: output.confirmationId,
          toolName: output.toolName ?? toolName,
        },
      })
      continue
    }

    if (
      output?.livePatch &&
      typeof output.livePatch === "object" &&
      (output.livePatch as { kind?: string }).kind === "live_graph_patch"
    ) {
      cards.push({
        key: `${message.id}-patch`,
        kind: "live_patch",
        title: "Graph ready for canvas",
        data: { livePatch: output.livePatch as Record<string, unknown> },
      })
      continue
    }

    const state = "state" in part ? String(part.state) : "unknown"
    cards.push({
      key: `${message.id}-${toolName}-${state}`,
      kind: "tool",
      title: toolName.replaceAll("_", " "),
      body: state === "output-available" ? "Done" : state,
    })
  }

  return cards
}

export function AssistantPanel() {
  const {
    open,
    setOpen,
    setAssistantStatus,
    quota,
    refreshQuota,
    threadId,
    setThreadId,
    confirmationToken,
    setConfirmationToken,
  } = useAssistant()
  const editor = useWorkflowEditorContext()

  const [input, setInput] = React.useState("")
  const [showHistory, setShowHistory] = React.useState(false)
  const [threads, setThreads] = React.useState<AiThreadSummary[]>([])
  const [threadsLoading, setThreadsLoading] = React.useState(false)
  const [threadLoading, setThreadLoading] = React.useState(false)
  const [draftChatId, setDraftChatId] = React.useState(() => crypto.randomUUID())
  const messagesRef = React.useRef<HTMLDivElement>(null)
  const appliedPatchesRef = React.useRef<Set<string>>(new Set())

  const threadIdRef = React.useRef(threadId)
  const confirmationTokenRef = React.useRef(confirmationToken)
  const editorRef = React.useRef(editor)

  React.useEffect(() => {
    threadIdRef.current = threadId
  }, [threadId])
  React.useEffect(() => {
    confirmationTokenRef.current = confirmationToken
  }, [confirmationToken])
  React.useEffect(() => {
    editorRef.current = editor
  }, [editor])

  const refreshThreads = React.useCallback(async () => {
    setThreadsLoading(true)
    try {
      const result = await listAiThreadsAction()
      if (result.threads) {
        setThreads(result.threads)
      }
    } finally {
      setThreadsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!open) return
    void refreshThreads()
  }, [open, refreshThreads])

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/ai/chat",
        prepareSendMessagesRequest: ({ messages, id, body }) => ({
          body: {
            ...body,
            id,
            messages,
            threadId: threadIdRef.current,
            confirmationToken: confirmationTokenRef.current,
            editor: editorRef.current.isActive
              ? {
                  workflowId: editorRef.current.workflowId,
                  selectedNodeId: editorRef.current.selectedNodeId,
                  liveCanvas: true,
                  nodeCount: editorRef.current.nodes.length,
                }
              : null,
          },
        }),
        fetch: async (input, init) => {
          const response = await fetch(input, init)
          const nextThread = response.headers.get("x-ai-thread-id")
          if (nextThread) {
            setThreadId(nextThread)
            void refreshThreads()
          }
          if (response.status === 402) {
            setAssistantStatus("quota-exhausted")
            await refreshQuota()
          }
          return response
        },
      }),
    [refreshQuota, refreshThreads, setAssistantStatus, setThreadId]
  )

  const { messages, sendMessage, status, stop, error, setMessages } = useChat({
    id: draftChatId,
    transport,
    onFinish: async () => {
      setConfirmationToken(null)
      await refreshQuota()
      void refreshThreads()
      setAssistantStatus("idle")
    },
    onError: () => {
      setAssistantStatus("error")
    },
  })

  React.useEffect(() => {
    if (status === "submitted") {
      setAssistantStatus("thinking")
    } else if (status === "streaming") {
      setAssistantStatus("streaming")
    }
  }, [status, setAssistantStatus])

  React.useEffect(() => {
    const node = messagesRef.current
    if (!node || !open || showHistory) return
    node.scrollTop = node.scrollHeight
  }, [messages, status, open, showHistory])

  React.useEffect(() => {
    if (!editor.applyGraph) return
    for (const message of messages) {
      for (const card of extractToolCards(message)) {
        if (card.kind !== "live_patch" || !card.data?.livePatch) continue
        if (appliedPatchesRef.current.has(card.key)) continue
        const patch = card.data.livePatch as {
          workflowId?: string
          graph?: { nodes: unknown[]; edges: unknown[] }
        }
        if (
          patch.workflowId &&
          patch.workflowId === editor.workflowId &&
          patch.graph
        ) {
          appliedPatchesRef.current.add(card.key)
          editor.applyGraph(
            patch.graph as Parameters<NonNullable<typeof editor.applyGraph>>[0]
          )
        }
      }
    }
  }, [messages, editor])

  const busy = status === "submitted" || status === "streaming"

  const lastMessage = messages.at(-1)
  const lastAssistantText =
    lastMessage?.role === "assistant" ? messageText(lastMessage) : ""
  const showTypingIndicator =
    status === "submitted" ||
    (status === "streaming" &&
      lastMessage?.role === "assistant" &&
      !lastAssistantText.trim())
  const typingLabel = status === "submitted" ? "Thinking" : "Writing"

  const handleNewChat = React.useCallback(() => {
    setThreadId(null)
    setDraftChatId(crypto.randomUUID())
    setMessages([])
    setConfirmationToken(null)
    setShowHistory(false)
    setInput("")
    setAssistantStatus("idle")
  }, [setConfirmationToken, setMessages, setAssistantStatus, setThreadId])

  const handleSelectThread = React.useCallback(
    async (nextThreadId: string) => {
      if (busy) return
      setThreadLoading(true)
      setShowHistory(false)
      setConfirmationToken(null)
      setAssistantStatus("idle")
      try {
        const result = await getAiThreadMessagesAction(nextThreadId)
        const loaded = (result.messages ?? []).map(storedToUiMessage)
        setThreadId(nextThreadId)
        setMessages(loaded)
      } finally {
        setThreadLoading(false)
      }
    },
    [
      busy,
      setConfirmationToken,
      setMessages,
      setAssistantStatus,
      setThreadId,
    ]
  )

  const handleSend = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || busy) return
    if (quota?.exhausted) {
      setAssistantStatus("quota-exhausted")
      return
    }
    setInput("")
    setShowHistory(false)
    setAssistantStatus("listening")
    await sendMessage({ text: trimmed })
  }

  const activeTitle =
    threads.find((thread) => thread.id === threadId)?.title ?? "New chat"

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        showOverlay={false}
        className="w-full gap-0 p-0 sm:max-w-lg"
      >
        <div className="flex h-full min-h-0 flex-col">
          <SheetHeader className="shrink-0 space-y-0 border-b px-4 py-3 pr-12">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <SparkleIcon className="size-4 shrink-0 text-primary" />
                  <span className="truncate">Amakai Assistant</span>
                </SheetTitle>
                <SheetDescription className="truncate">
                  {showHistory
                    ? "Chat history"
                    : quota
                      ? `${Math.floor(quota.remainingCredits).toLocaleString()} / ${Math.floor(quota.allowanceCredits).toLocaleString()} credits · ${activeTitle}`
                      : "Loading credits…"}
                </SheetDescription>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  size="icon-sm"
                  variant={showHistory ? "secondary" : "ghost"}
                  aria-label="Chat history"
                  aria-pressed={showHistory}
                  onClick={() => {
                    setShowHistory((value) => !value)
                    if (!showHistory) void refreshThreads()
                  }}
                >
                  <ClockCounterClockwiseIcon />
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  aria-label="New chat"
                  disabled={busy}
                  onClick={handleNewChat}
                >
                  <PlusIcon />
                </Button>
              </div>
            </div>
          </SheetHeader>

          {showHistory ? (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="shrink-0 border-b px-4 py-2">
                <Button
                  type="button"
                  size="sm"
                  className="w-full"
                  disabled={busy}
                  onClick={handleNewChat}
                >
                  <PlusIcon data-icon="inline-start" />
                  New chat
                </Button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
                {threadsLoading ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                    Loading history…
                  </p>
                ) : threads.length === 0 ? (
                  <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                    No chats yet. Start a conversation to see it here.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-0.5">
                    {threads.map((thread) => {
                      const active = thread.id === threadId
                      return (
                        <li key={thread.id}>
                          <button
                            type="button"
                            disabled={busy || threadLoading}
                            onClick={() => void handleSelectThread(thread.id)}
                            className={cn(
                              "flex w-full flex-col gap-0.5 rounded-lg px-3 py-2.5 text-left transition-colors",
                              active
                                ? "bg-muted"
                                : "hover:bg-muted/70"
                            )}
                          >
                            <span className="truncate text-sm font-medium">
                              {thread.title || "New chat"}
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {formatThreadTime(thread.updatedAt)}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          ) : (
            <>
              {quota?.exhausted ? (
                <div className="flex shrink-0 items-start gap-2 border-b bg-destructive/5 px-3 py-2 text-xs">
                  <WarningCircleIcon className="mt-0.5 size-3.5 text-destructive" />
                  <div className="flex-1">
                    <p className="font-medium text-destructive">
                      AI credits exhausted
                    </p>
                    <p className="text-muted-foreground">
                      Upgrade to Pro for 10,000 credits / month.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      render={<Link href="/admin/billing/pro" />}
                    >
                      Upgrade to Pro
                    </Button>
                  </div>
                </div>
              ) : null}

              <div
                ref={messagesRef}
                className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
              >
                {threadLoading ? (
                  <p className="px-4 py-8 text-center text-xs text-muted-foreground">
                    Loading conversation…
                  </p>
                ) : (
                  <div className="flex flex-col gap-3 p-3">
                    {messages.length === 0 ? (
                      <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
                        Ask questions, get step-by-step help, or request
                        workflows and tables — I figure out what you need.
                        Open history anytime to resume a past chat.
                      </div>
                    ) : null}

                    {messages.map((message) => {
                      const text = messageText(message)
                      const cards = extractToolCards(message)
                      const isStreamingThisMessage =
                        status === "streaming" &&
                        message.role === "assistant" &&
                        message.id === lastMessage?.id &&
                        text.trim().length > 0
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex flex-col gap-2",
                            message.role === "user"
                              ? "items-end"
                              : "items-start"
                          )}
                        >
                          {text ? (
                            <div
                              className={cn(
                                "max-w-[92%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                                message.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              )}
                            >
                              {text}
                              {isStreamingThisMessage ? (
                                <AssistantStreamCursor />
                              ) : null}
                            </div>
                          ) : null}

                          {cards.map((card) => (
                            <div
                              key={card.key}
                              className="w-full max-w-[92%] rounded-lg border bg-background p-2.5 text-xs"
                            >
                              <p className="mb-1 font-medium capitalize">
                                {card.title}
                              </p>
                              {card.body ? (
                                <p className="text-muted-foreground">
                                  {card.body}
                                </p>
                              ) : null}

                              {card.kind === "clarification" &&
                              Array.isArray(card.data?.questions)
                                ? (
                                    card.data.questions as Array<{
                                      id: string
                                      question: string
                                      options?: Array<{
                                        id: string
                                        label: string
                                      }>
                                    }>
                                  ).map((question) => (
                                    <div
                                      key={question.id}
                                      className="mt-2 space-y-1.5"
                                    >
                                      <p>{question.question}</p>
                                      <div className="flex flex-wrap gap-1">
                                        {(question.options ?? []).map(
                                          (option) => (
                                            <Button
                                              key={option.id}
                                              size="sm"
                                              variant="outline"
                                              disabled={busy}
                                              onClick={() =>
                                                void handleSend(
                                                  `${question.question} → ${option.label}`
                                                )
                                              }
                                            >
                                              {option.label}
                                            </Button>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  ))
                                : null}

                              {card.kind === "plan" && card.data?.plan ? (
                                <div className="mt-2 space-y-2">
                                  <p className="font-medium">
                                    {String(
                                      (card.data.plan as { title?: string })
                                        .title ?? "Plan"
                                    )}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {String(
                                      (card.data.plan as { summary?: string })
                                        .summary ?? ""
                                    )}
                                  </p>
                                  <ol className="list-decimal space-y-1 pl-4">
                                    {(
                                      (
                                        card.data.plan as {
                                          steps?: Array<{
                                            title: string
                                            detail: string
                                          }>
                                        }
                                      ).steps ?? []
                                    ).map((step, index) => (
                                      <li key={`${step.title}-${index}`}>
                                        <span className="font-medium">
                                          {step.title}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {" "}
                                          — {step.detail}
                                        </span>
                                      </li>
                                    ))}
                                  </ol>
                                  <div className="flex gap-2 pt-1">
                                    <Button
                                      size="sm"
                                      disabled={busy}
                                      onClick={() =>
                                        void handleSend(
                                          "Approved. Please execute the proposed build plan."
                                        )
                                      }
                                    >
                                      <CheckIcon data-icon="inline-start" />
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={busy}
                                      onClick={() =>
                                        void handleSend(
                                          "Please refine the plan before executing."
                                        )
                                      }
                                    >
                                      Refine
                                    </Button>
                                  </div>
                                </div>
                              ) : null}

                              {card.kind === "confirm" ? (
                                <div className="mt-2 flex gap-2">
                                  <Button
                                    size="sm"
                                    disabled={busy}
                                    onClick={() => {
                                      setConfirmationToken(
                                        String(card.data?.confirmationId ?? "")
                                      )
                                      void handleSend(
                                        `Confirm ${String(card.data?.toolName ?? "action")} with the pending confirmation token.`
                                      )
                                    }}
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    disabled={busy}
                                    onClick={() =>
                                      void handleSend("Cancel that action.")
                                    }
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              ) : null}

                              {card.kind === "live_patch" ? (
                                <p className="mt-1 text-muted-foreground">
                                  Applied to the open workflow canvas
                                  (undoable).
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )
                    })}

                    {showTypingIndicator ? (
                      <AssistantTypingIndicator label={typingLabel} />
                    ) : null}

                    {error ? (
                      <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                        {error.message || "Something went wrong."}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="ml-2"
                          onClick={() => setMessages([])}
                        >
                          Clear
                        </Button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t p-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder="Ask, get guidance, or request builds…"
                    rows={2}
                    className="min-h-[2.75rem] resize-none"
                    disabled={busy || Boolean(quota?.exhausted) || threadLoading}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault()
                        void handleSend(input)
                      }
                    }}
                  />
                  {busy ? (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={() => stop()}
                      aria-label="Stop"
                    >
                      <CircleNotchIcon className="animate-spin" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon"
                      disabled={
                        !input.trim() ||
                        Boolean(quota?.exhausted) ||
                        threadLoading
                      }
                      onClick={() => void handleSend(input)}
                      aria-label="Send"
                    >
                      <ArrowUpIcon />
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
