import type { PlaygroundStep } from "@/lib/engine/types"

export type NodeStepPayloads = {
  input?: unknown
  output?: unknown
}

export function findLatestNodeStepPayloads(
  steps: PlaygroundStep[],
  nodeId: string
): NodeStepPayloads | null {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index]

    if (step.nodeId !== nodeId) {
      continue
    }

    if (
      step.type !== "node_exit" &&
      step.type !== "node_error" &&
      step.type !== "pending_approval" &&
      step.type !== "pending_wait"
    ) {
      continue
    }

    if (step.inputPayload === undefined && step.outputPayload === undefined) {
      continue
    }

    return {
      input: step.inputPayload,
      output: step.outputPayload,
    }
  }

  return null
}
