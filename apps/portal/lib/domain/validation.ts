export type ValidationStage = {
  order: number
  name: string
  status: "pending" | "pass" | "fail" | "warn"
}

export type ValidationCheck = {
  id: string
  stage: string
  message: string
  severity: "error" | "warning" | "info"
}
