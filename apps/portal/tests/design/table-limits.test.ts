import {
  buildDataTableLimitState,
  dataTableLimitReachedMessage,
  MAX_DATA_TABLES_PER_USER,
} from "@/lib/data/table-limits"

describe("table-limits", () => {
  it("allows creation below the cap", () => {
    expect(buildDataTableLimitState(9)).toEqual({
      count: 9,
      limit: MAX_DATA_TABLES_PER_USER,
      canCreate: true,
    })
  })

  it("blocks creation at the cap", () => {
    expect(buildDataTableLimitState(10)).toEqual({
      count: 10,
      limit: MAX_DATA_TABLES_PER_USER,
      canCreate: false,
    })
  })

  it("returns a clear limit message", () => {
    expect(dataTableLimitReachedMessage()).toMatch(/10 tables per account/)
  })
})
