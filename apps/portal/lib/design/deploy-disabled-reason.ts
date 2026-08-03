import type { ValidationStatus } from "@/hooks/use-workflow-validation"

export function getDeployDisabledReason(
  isDeployable: boolean,
  validationStatus: ValidationStatus
): string | null {
  if (isDeployable) {
    return null
  }

  switch (validationStatus) {
    case "failed":
      return "Validation failed — fix errors and run Validate again"
    case "running":
      return "Validation in progress — wait for it to finish"
    case "pending_approval":
      return "Complete the approval step in validation before deploying"
    case "pending_wait":
      return "Complete the wait step in validation before deploying"
    case "passed":
      return "Workflow changed since validation — run Validate again"
    case "idle":
    default:
      return "Run Validate in the playground before deploying"
  }
}
