import {
  cronMatches,
  cronSlotKey,
  isCronDue,
  isValidCronExpression,
  parseCronExpression,
} from "@/lib/cron/expression"

describe("cron expression", () => {
  it("accepts standard 5-field expressions", () => {
    expect(isValidCronExpression("0 9 * * 1-5")).toBe(true)
    expect(isValidCronExpression("*/5 * * * *")).toBe(true)
    expect(isValidCronExpression("0 0 1 1 *")).toBe(true)
    expect(parseCronExpression("bad")).toBeNull()
    expect(isValidCronExpression("0 9 * *")).toBe(false)
  })

  it("matches UTC minute fields", () => {
    // 2024-01-15 09:00 UTC = Monday
    const mondayNine = new Date(Date.UTC(2024, 0, 15, 9, 0, 0))
    expect(cronMatches("0 9 * * 1-5", mondayNine)).toBe(true)
    expect(cronMatches("0 10 * * 1-5", mondayNine)).toBe(false)
    expect(cronMatches("*/15 * * * *", new Date(Date.UTC(2024, 0, 15, 9, 30, 0)))).toBe(
      true
    )
  })

  it("is due only once per UTC minute", () => {
    const now = new Date(Date.UTC(2024, 0, 15, 9, 0, 30))
    expect(
      isCronDue({
        expression: "0 9 * * 1-5",
        now,
        lastFiredAt: null,
      })
    ).toBe(true)

    expect(
      isCronDue({
        expression: "0 9 * * 1-5",
        now,
        lastFiredAt: new Date(Date.UTC(2024, 0, 15, 9, 0, 5)),
      })
    ).toBe(false)

    expect(cronSlotKey(now)).toBe("2024-01-15T09:00")
  })
})
