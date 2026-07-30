"use client"

import * as React from "react"

import { saveWorkflowDraftAction } from "@/lib/actions/workflow-actions"
import type { Workflow } from "@/lib/domain/workflow"

export type DraftSaveStatus = "idle" | "pending" | "saving" | "saved" | "error"

/** Content-only snapshot — id changes after first save must not count as unsaved edits. */
function serializeWorkflowContent(workflow: Workflow) {
  return JSON.stringify({
    name: workflow.name,
    status: workflow.status ?? "draft",
    nodes: workflow.nodes,
    edges: workflow.edges ?? [],
  })
}

function mergeSavedMetadata(current: Workflow, saved: Workflow): Workflow {
  return {
    ...current,
    id: saved.id,
    status: saved.status,
    name: saved.name,
    updatedAt: saved.updatedAt,
  }
}

export function useWorkflowAutoSave(
  workflow: Workflow,
  onSaved: (saved: Workflow) => void,
  debounceMs = 800
) {
  const [status, setStatus] = React.useState<DraftSaveStatus>("idle")
  const [error, setError] = React.useState<string | null>(null)
  const isFirstMount = React.useRef(true)
  const workflowRef = React.useRef(workflow)
  const lastSavedContent = React.useRef(serializeWorkflowContent(workflow))
  const saveGenerationRef = React.useRef(0)
  const onSavedRef = React.useRef(onSaved)

  workflowRef.current = workflow
  onSavedRef.current = onSaved

  const contentSnapshot = serializeWorkflowContent(workflow)
  const isDirty = contentSnapshot !== lastSavedContent.current

  React.useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      lastSavedContent.current = contentSnapshot
      return
    }

    if (!isDirty) {
      return
    }

    setStatus((current) => (current === "pending" ? current : "pending"))
    setError(null)

    const generation = ++saveGenerationRef.current

    const timer = window.setTimeout(async () => {
      if (generation !== saveGenerationRef.current) {
        return
      }

      setStatus("saving")

      try {
        const payload = workflowRef.current
        const result = await saveWorkflowDraftAction(payload)

        if (generation !== saveGenerationRef.current) {
          return
        }

        if ("error" in result) {
          setStatus("error")
          setError(result.error)
          return
        }

        const merged = mergeSavedMetadata(payload, result.workflow)
        workflowRef.current = merged
        lastSavedContent.current = serializeWorkflowContent(merged)
        onSavedRef.current(result.workflow)
        setStatus("saved")
        setError(null)
      } catch (caught) {
        if (generation !== saveGenerationRef.current) {
          return
        }

        setStatus("error")
        setError(
          caught instanceof Error ? caught.message : "Failed to save workflow draft."
        )
      }
    }, debounceMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [contentSnapshot, debounceMs, isDirty])

  React.useEffect(() => {
    if (status !== "saved") {
      return
    }

    const timer = window.setTimeout(() => {
      if (
        serializeWorkflowContent(workflowRef.current) ===
        lastSavedContent.current
      ) {
        setStatus("idle")
      }
    }, 2500)

    return () => window.clearTimeout(timer)
  }, [status])

  const flushSave = React.useCallback(async () => {
    const payload = workflowRef.current

    if (serializeWorkflowContent(payload) === lastSavedContent.current) {
      return { workflow: payload, error: null as string | null }
    }

    const generation = ++saveGenerationRef.current
    setStatus("saving")
    setError(null)

    try {
      const result = await saveWorkflowDraftAction(payload)

      if (generation !== saveGenerationRef.current) {
        return { workflow: workflowRef.current, error: null as string | null }
      }

      if ("error" in result) {
        setStatus("error")
        setError(result.error)
        return { workflow: payload, error: result.error }
      }

      const merged = mergeSavedMetadata(payload, result.workflow)
      workflowRef.current = merged
      lastSavedContent.current = serializeWorkflowContent(merged)
      onSavedRef.current(result.workflow)
      setStatus("saved")
      setError(null)
      return { workflow: merged, error: null as string | null }
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Failed to save workflow draft."

      setStatus("error")
      setError(message)
      return { workflow: payload, error: message }
    }
  }, [])

  return { status, error, flushSave, isDirty }
}
