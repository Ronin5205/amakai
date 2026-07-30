import type { ValidationCheck, ValidationStage } from "@/lib/domain/validation"

export const validationStageFixtures: ValidationStage[] = [
  {
    order: 1,
    name: "Schema Validation",
    status: "pass",
  },
  {
    order: 2,
    name: "Dependency Check",
    status: "pass",
  },
  {
    order: 3,
    name: "Node Connectivity",
    status: "pass",
  },
  {
    order: 4,
    name: "Security Scan",
    status: "warn",
  },
  {
    order: 5,
    name: "Configuration Review",
    status: "pending",
  },
  {
    order: 6,
    name: "Environment Readiness",
    status: "pending",
  },
]

export const validationCheckFixtures: ValidationCheck[] = [
  {
    id: "v-001",
    stage: "Security Scan",
    message:
      "OAuth scope for payroll integration may be overly permissive — review before deployment",
    severity: "warning",
  },
  {
    id: "v-002",
    stage: "Configuration Review",
    message: "Finance review threshold not configured for conditional node n5",
    severity: "error",
  },
  {
    id: "v-003",
    stage: "Dependency Check",
    message: "All required component dependencies are satisfied",
    severity: "info",
  },
]
