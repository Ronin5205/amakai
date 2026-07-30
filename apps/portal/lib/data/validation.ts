import type { ValidationCheck, ValidationStage } from "@/lib/domain/validation"
import {
  validationCheckFixtures,
  validationStageFixtures,
} from "./fixtures/validation"

export async function getValidationStages(): Promise<ValidationStage[]> {
  return validationStageFixtures
}

export async function getValidationChecks(): Promise<ValidationCheck[]> {
  return validationCheckFixtures
}
