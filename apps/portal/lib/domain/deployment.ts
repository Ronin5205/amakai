export type EnvironmentKind = "development" | "staging" | "production"

export type Environment = {
  id: string
  name: string
  kind: EnvironmentKind
  status: "active" | "inactive" | "deploying"
  deployedVersion: string
  health: "healthy" | "degraded" | "down"
  workflowCount: number
}

export type WorkflowVersion = {
  id: string
  version: string
  workflowName: string
  createdAt: string
  author: string
  changelog?: string
  isCurrent?: boolean
}

export type Release = {
  id: string
  environment: string
  version: string
  status: "deployed" | "rolling_back" | "failed" | "pending"
  deployedAt: string
  deployedBy: string
}
