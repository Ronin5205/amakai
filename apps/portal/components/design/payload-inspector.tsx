"use client"

import * as React from "react"

import { formatJsonForDisplay } from "@/lib/design/json-value"
import { cn } from "@amakai/shared/lib/utils"

export function JsonPayloadBlock({
  value,
  label,
  className,
  maxHeightClassName = "max-h-56",
}: {
  value: unknown
  label?: string
  className?: string
  maxHeightClassName?: string
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      {label ? (
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
      ) : null}
      <pre
        className={cn(
          "overflow-auto rounded-none border bg-background p-3 font-mono text-xs leading-relaxed",
          maxHeightClassName
        )}
      >
        {formatJsonForDisplay(value)}
      </pre>
    </div>
  )
}

export function PayloadIoPanel({
  input,
  output,
  className,
}: {
  input?: unknown
  output?: unknown
  className?: string
}) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      <JsonPayloadBlock label="Input" value={input} />
      <JsonPayloadBlock label="Output" value={output} />
    </div>
  )
}

export function NodeRuntimePayloadSection({
  input,
  output,
  emptyMessage = "Run validation to preview JSON input and output for this node.",
}: {
  input?: unknown
  output?: unknown
  emptyMessage?: string
}) {
  const hasPayload = input !== undefined || output !== undefined

  if (!hasPayload) {
    return (
      <div className="rounded-none border border-dashed px-3 py-4 text-xs text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        JSON payload from the latest playground run.
      </p>
      <PayloadIoPanel input={input} output={output} />
    </div>
  )
}
