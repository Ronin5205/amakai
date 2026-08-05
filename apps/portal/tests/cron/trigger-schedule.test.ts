import {
  createDefaultTriggerSchedule,
  getOnceFiresAtUtc,
  isTriggerScheduleDue,
  parseTriggerSchedule,
  type TriggerSchedule,
} from "@/lib/domain/trigger-schedule"

describe("trigger schedule", () => {
  it("parses a valid once schedule", () => {
    const schedule = createDefaultTriggerSchedule(
      new Date("2024-01-15T12:00:00")
    )
    expect(parseTriggerSchedule(schedule)?.repeat).toBe("once")
    expect(isTriggerScheduleDue).toBeDefined()
  })

  it("fires a one-time schedule at the local date and minute", () => {
    const schedule: TriggerSchedule = {
      version: 1,
      repeat: "once",
      hour: 9,
      minute: 30,
      date: "2024-01-15",
      timezoneOffsetMinutes: 300, // EST
    }

    const firesAt = getOnceFiresAtUtc(schedule)
    expect(firesAt?.toISOString()).toBe("2024-01-15T14:30:00.000Z")

    expect(
      isTriggerScheduleDue({
        schedule,
        now: new Date("2024-01-15T14:29:00.000Z"),
        lastFiredAt: null,
      })
    ).toBe(false)

    expect(
      isTriggerScheduleDue({
        schedule,
        now: new Date("2024-01-15T14:30:00.000Z"),
        lastFiredAt: null,
      })
    ).toBe(true)
  })

  it("fires weekdays only on matching local days", () => {
    const schedule: TriggerSchedule = {
      version: 1,
      repeat: "weekdays",
      hour: 9,
      minute: 0,
      timezoneOffsetMinutes: 0,
    }

    // Monday 09:00 UTC
    expect(
      isTriggerScheduleDue({
        schedule,
        now: new Date("2024-01-15T09:00:00.000Z"),
        lastFiredAt: null,
      })
    ).toBe(true)

    // Sunday 09:00 UTC
    expect(
      isTriggerScheduleDue({
        schedule,
        now: new Date("2024-01-14T09:00:00.000Z"),
        lastFiredAt: null,
      })
    ).toBe(false)
  })
})
