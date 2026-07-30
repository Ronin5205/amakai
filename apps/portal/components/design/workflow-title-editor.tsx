"use client"

import * as React from "react"
import { PencilSimpleIcon } from "@phosphor-icons/react"

import { Button } from "@amakai/shared/components/ui/button"
import { Input } from "@amakai/shared/components/ui/input"
import { cn } from "@amakai/shared/lib/utils"

export interface WorkflowTitleEditorProps {
  name: string
  onNameChange: (name: string) => void
  className?: string
}

export function WorkflowTitleEditor({
  name,
  onNameChange,
  className,
}: WorkflowTitleEditorProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [draftName, setDraftName] = React.useState(name)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!isEditing) {
      setDraftName(name)
    }
  }, [isEditing, name])

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const commitName = () => {
    const trimmed = draftName.trim()
    if (trimmed && trimmed !== name) {
      onNameChange(trimmed)
    } else {
      setDraftName(name)
    }
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={draftName}
        onChange={(event) => setDraftName(event.target.value)}
        onBlur={commitName}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault()
            commitName()
          }
          if (event.key === "Escape") {
            event.preventDefault()
            setDraftName(name)
            setIsEditing(false)
          }
        }}
        className={cn(
          "font-heading h-9 max-w-md text-xl font-medium tracking-tight",
          className
        )}
        aria-label="Workflow name"
      />
    )
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-1.5", className)}>
      <h1 className="font-heading truncate text-xl font-medium tracking-tight">
        {name}
      </h1>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Rename workflow"
        onClick={() => setIsEditing(true)}
      >
        <PencilSimpleIcon />
      </Button>
    </div>
  )
}
