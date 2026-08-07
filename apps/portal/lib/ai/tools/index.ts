import type { AiToolSafety } from "@/lib/domain/ai"
import { createPlanningTools } from "@/lib/ai/tools/planning"
import { createReadTools } from "@/lib/ai/tools/read"
import { createWriteTools } from "@/lib/ai/tools/write"
import { ALL_TOOL_META } from "@/lib/ai/tools/meta"
import {
  ASSISTANT_ALLOWED_SAFETY,
  type AiToolContext,
} from "@/lib/ai/tools/types"

export { ALL_TOOL_META } from "@/lib/ai/tools/meta"

export function getToolSafety(name: string): AiToolSafety | null {
  const meta = ALL_TOOL_META.find((entry) => entry.name === name)
  return meta?.safety ?? null
}

export function toolsAllowedForAssistant(): string[] {
  return ALL_TOOL_META.filter((entry) =>
    ASSISTANT_ALLOWED_SAFETY.includes(entry.safety)
  ).map((entry) => entry.name)
}

export function createAssistantTools(ctx: AiToolContext) {
  return {
    ...createReadTools(ctx),
    ...createPlanningTools(),
    ...createWriteTools(ctx),
  }
}

export {
  isToolAllowed,
  ASSISTANT_ALLOWED_SAFETY,
  type AiToolContext,
} from "@/lib/ai/tools/types"
