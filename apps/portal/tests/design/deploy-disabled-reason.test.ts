import { getDeployDisabledReason } from "@/lib/design/deploy-disabled-reason"

describe("getDeployDisabledReason", () => {
  it("returns null when the workflow is deployable", () => {
    expect(getDeployDisabledReason(true, "passed")).toBeNull()
  })

  it("returns validation guidance for each blocked state", () => {
    expect(getDeployDisabledReason(false, "idle")).toMatch(/Validate/i)
    expect(getDeployDisabledReason(false, "failed")).toMatch(/failed/i)
    expect(getDeployDisabledReason(false, "passed")).toMatch(/changed since validation/i)
    expect(getDeployDisabledReason(false, "pending_approval")).toMatch(/approval/i)
  })
})
