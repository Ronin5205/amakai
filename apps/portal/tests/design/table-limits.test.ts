import {
  buildDataTableLimitState,
  dataTableLimitReachedMessage,
} from "@/lib/data/table-limits"
import { DATA_TABLE_LIMIT_BY_PLAN } from "@/lib/data/plan-limits"

describe("table-limits", () => {
  it("allows creation below the cap", () => {
    expect(buildDataTableLimitState(9, DATA_TABLE_LIMIT_BY_PLAN.free)).toEqual({
      count: 9,
      limit: 10,
      canCreate: true,
    })
  })

  it("blocks creation at the cap", () => {
    expect(buildDataTableLimitState(10, DATA_TABLE_LIMIT_BY_PLAN.free)).toEqual({
      count: 10,
      limit: 10,
      canCreate: false,
    })
  })

  it("returns a clear limit message", () => {
    expect(dataTableLimitReachedMessage(10)).toMatch(/10 tables per account/)
  })
})
