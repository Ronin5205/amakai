"use client"

import { cn } from "@amakai/shared/lib/utils"

export function AssistantTypingIndicator({
  label = "Thinking",
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn("flex items-start", className)}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="assistant-typing flex max-w-[92%] items-center gap-2.5 rounded-lg bg-muted px-3 py-2.5">
        <span className="flex items-center gap-1" aria-hidden="true">
          <span className="assistant-typing__dot size-1.5 rounded-full bg-foreground/55" />
          <span className="assistant-typing__dot size-1.5 rounded-full bg-foreground/55" />
          <span className="assistant-typing__dot size-1.5 rounded-full bg-foreground/55" />
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

export function AssistantStreamCursor({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "assistant-stream-cursor ml-0.5 inline-block align-baseline text-primary",
        className
      )}
      aria-hidden="true"
    >
      ▍
    </span>
  )
}
