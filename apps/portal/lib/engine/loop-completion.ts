export type LoopWorkContext = {
  loopNodeId: string
}

export type LoopCompletionTracker = {
  remaining: number
  totalItems: number
  donePayload: unknown
}

export type LoopCompletionBuffer = Map<string, LoopCompletionTracker>

export function createLoopCompletionBuffer() {
  return new Map<string, LoopCompletionTracker>()
}

/**
 * Registers pending work units for a loop fan-out.
 * `workUnits` is typically items × loop-edge count.
 */
export function beginLoopFanOut(
  buffer: LoopCompletionBuffer,
  loopNodeId: string,
  workUnits: number,
  totalItems: number,
  donePayload: unknown
) {
  buffer.set(loopNodeId, {
    remaining: Math.max(0, workUnits),
    totalItems,
    donePayload,
  })
}

/**
 * After a node with loop context finishes:
 * - If it spawned children, replace this work unit with child work units.
 * - If it spawned none, consume this work unit.
 * Returns true when the loop is fully complete and done should fire.
 */
export function settleLoopWorkUnit(
  buffer: LoopCompletionBuffer,
  loopNodeId: string,
  childWorkUnits: number
): { completed: boolean; tracker?: LoopCompletionTracker } {
  const tracker = buffer.get(loopNodeId)
  if (!tracker) {
    return { completed: false }
  }

  if (childWorkUnits > 0) {
    tracker.remaining += childWorkUnits - 1
  } else {
    tracker.remaining -= 1
  }

  if (tracker.remaining > 0) {
    return { completed: false, tracker }
  }

  buffer.delete(loopNodeId)
  return { completed: true, tracker }
}

export function getLoopTracker(
  buffer: LoopCompletionBuffer,
  loopNodeId: string
) {
  return buffer.get(loopNodeId)
}
