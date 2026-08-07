"use client"

import * as React from "react"

import { cn } from "@amakai/shared/lib/utils"

const INLINE_MARKDOWN =
  /(\*\*(.+?)\*\*|__(.+?)__|\*([^*]+)\*|_([^_]+)_|`([^`]+)`)/g

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null

  INLINE_MARKDOWN.lastIndex = 0
  while ((match = INLINE_MARKDOWN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    const bold = match[2] ?? match[3]
    const italic = match[4] ?? match[5]
    const code = match[6]

    if (bold) {
      parts.push(
        <strong key={`${match.index}-bold`} className="font-semibold">
          {bold}
        </strong>
      )
    } else if (italic) {
      parts.push(<em key={`${match.index}-italic`}>{italic}</em>)
    } else if (code) {
      parts.push(
        <code
          key={`${match.index}-code`}
          className="rounded-sm bg-background/60 px-1 py-0.5 font-mono text-[0.85em]"
        >
          {code}
        </code>
      )
    }

    lastIndex = INLINE_MARKDOWN.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

export function AssistantMessageContent({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  const lines = children.split("\n")

  return (
    <div className={cn("text-sm", className)}>
      {lines.map((line, index) => (
        <React.Fragment key={index}>
          {renderInlineMarkdown(line)}
          {index < lines.length - 1 ? <br /> : null}
        </React.Fragment>
      ))}
    </div>
  )
}
