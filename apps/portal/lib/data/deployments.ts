import type {
  Environment,
  Release,
  WorkflowVersion,
} from "@/lib/domain/deployment"
import {
  environmentFixtures,
  releaseFixtures,
  versionFixtures,
} from "./fixtures/deployments"

export async function listEnvironments(): Promise<Environment[]> {
  return environmentFixtures
}

export async function listVersions(): Promise<WorkflowVersion[]> {
  return versionFixtures
}

export async function listReleases(): Promise<Release[]> {
  return releaseFixtures
}
