import "server-only"

import type { AiMode, AiStoredMessage, AiThreadSummary } from "@/lib/domain/ai"
import { MAX_ACTIVE_AI_THREADS, normalizeAiMode, selectExcessThreadIds } from "@/lib/domain/ai"
import { createClient } from "@/utils/supabase/server"

type ThreadRow = {
  id: string
  user_id: string
  title: string
  mode: string
  created_at: string
  updated_at: string
}

type MessageRow = {
  id: string
  thread_id: string
  user_id: string
  role: string
  content: string
  parts: unknown
  created_at: string
}

async function getAuth() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error || !user) return null
  return { supabase, userId: user.id }
}

function mapThread(row: ThreadRow): AiThreadSummary {
  return {
    id: row.id,
    title: row.title,
    mode: normalizeAiMode(row.mode),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function mapMessage(row: MessageRow): AiStoredMessage {
  return {
    id: row.id,
    threadId: row.thread_id,
    role:
      row.role === "assistant" ||
      row.role === "system" ||
      row.role === "tool"
        ? row.role
        : "user",
    content: row.content ?? "",
    parts: Array.isArray(row.parts) ? row.parts : [],
    createdAt: row.created_at,
  }
}

async function pruneExcessAiThreads(
  auth: { supabase: Awaited<ReturnType<typeof createClient>>; userId: string },
  options?: { reserveSlots?: number; excludeThreadId?: string }
): Promise<void> {
  const { data, error } = await auth.supabase
    .from("ai_threads")
    .select("id")
    .eq("user_id", auth.userId)
    .order("updated_at", { ascending: true })

  if (error || !data) return

  const orderedIds = (data as { id: string }[])
    .map((row) => row.id)
    .filter((id) => id !== options?.excludeThreadId)

  const toDelete = selectExcessThreadIds(
    orderedIds,
    MAX_ACTIVE_AI_THREADS,
    options?.reserveSlots ?? 0
  )

  if (toDelete.length === 0) return

  await auth.supabase
    .from("ai_threads")
    .delete()
    .eq("user_id", auth.userId)
    .in("id", toDelete)
}

export async function listAiThreads(): Promise<AiThreadSummary[]> {
  const auth = await getAuth()
  if (!auth) return []

  const { data, error } = await auth.supabase
    .from("ai_threads")
    .select("*")
    .eq("user_id", auth.userId)
    .order("updated_at", { ascending: false })
    .limit(MAX_ACTIVE_AI_THREADS)

  if (error || !data) return []
  return (data as ThreadRow[]).map(mapThread)
}

export async function getOrCreateAiThread(input: {
  threadId?: string | null
  mode?: AiMode
  title?: string
}): Promise<AiThreadSummary> {
  const auth = await getAuth()
  if (!auth) {
    throw new Error("Sign in to use the AI assistant.")
  }

  const mode = normalizeAiMode(input.mode)

  if (input.threadId) {
    const { data, error } = await auth.supabase
      .from("ai_threads")
      .select("*")
      .eq("id", input.threadId)
      .eq("user_id", auth.userId)
      .maybeSingle()

    if (!error && data) {
      const thread = mapThread(data as ThreadRow)
      if (thread.mode !== mode) {
        await auth.supabase
          .from("ai_threads")
          .update({ mode, updated_at: new Date().toISOString() })
          .eq("id", thread.id)
          .eq("user_id", auth.userId)
        return { ...thread, mode }
      }
      return thread
    }
  }

  await pruneExcessAiThreads(auth, { reserveSlots: 1 })

  const { data, error } = await auth.supabase
    .from("ai_threads")
    .insert({
      user_id: auth.userId,
      title: input.title?.trim() || "New chat",
      mode,
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create AI thread.")
  }

  await pruneExcessAiThreads(auth)

  return mapThread(data as ThreadRow)
}

export async function listAiMessages(
  threadId: string
): Promise<AiStoredMessage[]> {
  const auth = await getAuth()
  if (!auth) return []

  const { data, error } = await auth.supabase
    .from("ai_messages")
    .select("*")
    .eq("thread_id", threadId)
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: true })
    .limit(100)

  if (error || !data) return []
  return (data as MessageRow[]).map(mapMessage)
}

export async function appendAiMessage(input: {
  threadId: string
  role: AiStoredMessage["role"]
  content: string
  parts?: unknown[]
}): Promise<AiStoredMessage> {
  const auth = await getAuth()
  if (!auth) {
    throw new Error("Sign in to save AI messages.")
  }

  const { data, error } = await auth.supabase
    .from("ai_messages")
    .insert({
      thread_id: input.threadId,
      user_id: auth.userId,
      role: input.role,
      content: input.content,
      parts: input.parts ?? [],
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save AI message.")
  }

  await auth.supabase
    .from("ai_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.threadId)
    .eq("user_id", auth.userId)

  return mapMessage(data as MessageRow)
}

export async function touchAiThreadTitle(
  threadId: string,
  title: string
): Promise<void> {
  const auth = await getAuth()
  if (!auth) return

  await auth.supabase
    .from("ai_threads")
    .update({
      title: title.trim().slice(0, 80) || "New chat",
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId)
    .eq("user_id", auth.userId)
}

export async function deleteAiThread(threadId: string): Promise<void> {
  const auth = await getAuth()
  if (!auth) {
    throw new Error("Sign in to delete AI threads.")
  }

  const { error } = await auth.supabase
    .from("ai_threads")
    .delete()
    .eq("id", threadId)
    .eq("user_id", auth.userId)

  if (error) {
    throw new Error(error.message ?? "Failed to delete AI thread.")
  }
}

export async function countUserAiThreads(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("ai_threads")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (error) {
    return 0
  }

  return count ?? 0
}

export async function deleteAllAiThreads(): Promise<number> {
  const auth = await getAuth()
  if (!auth) {
    throw new Error("Sign in to delete AI chats.")
  }

  const count = await countUserAiThreads(auth.supabase, auth.userId)

  const { error } = await auth.supabase
    .from("ai_threads")
    .delete()
    .eq("user_id", auth.userId)

  if (error) {
    throw new Error(error.message ?? "Failed to delete AI chats.")
  }

  return count
}
