"use server"

import { getAiQuotaSnapshot } from "@/lib/data/ai-usage"
import { listAiMessages, listAiThreads } from "@/lib/data/ai-threads"

export async function getAiQuotaAction() {
  try {
    const quota = await getAiQuotaSnapshot()
    return { quota }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to load AI quota.",
    }
  }
}

export async function listAiThreadsAction() {
  try {
    const threads = await listAiThreads()
    return { threads }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to list AI threads.",
    }
  }
}

export async function getAiThreadMessagesAction(threadId: string) {
  try {
    const messages = await listAiMessages(threadId)
    return { messages }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Failed to load AI messages.",
    }
  }
}
