"use client"

import { SparkleIcon } from "@phosphor-icons/react"

import { useAssistant } from "@/components/ai/assistant-provider"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@amakai/shared/components/ui/tooltip"
import { cn } from "@amakai/shared/lib/utils"

export function AssistantTrigger() {
  const { open, setOpen, assistantStatus } = useAssistant()
  const busy =
    assistantStatus === "thinking" ||
    assistantStatus === "streaming" ||
    assistantStatus === "listening"

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label={open ? "Close Amakai Assistant" : "Open Amakai Assistant"}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className={cn(
              open && "bg-muted",
              assistantStatus === "error" && "text-destructive",
              assistantStatus === "quota-exhausted" && "text-muted-foreground"
            )}
          />
        }
      >
        <SparkleIcon
          weight={open || busy ? "fill" : "regular"}
          className={cn(busy && "animate-pulse text-primary")}
        />
      </TooltipTrigger>
      <TooltipContent side="bottom">Assistant</TooltipContent>
    </Tooltip>
  )
}
