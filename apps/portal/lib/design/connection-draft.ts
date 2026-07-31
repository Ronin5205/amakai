export type ConnectionDraft = {
  nodeId: string
  portId?: string
  side: "input" | "output"
}

export type ConnectionDraftScreenPoint = {
  clientX: number
  clientY: number
}

export type PendingConnectionPlacement = {
  draft: ConnectionDraft
  worldPoint: { x: number; y: number }
}
