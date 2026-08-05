export type ScheduleRepeat = "once" | "daily" | "weekdays" | "weekly"

export type TriggerSchedule = {
  version: 1
  repeat: ScheduleRepeat
  /** Local wall-clock hour (0–23). */
  hour: number
  /** Local wall-clock minute (0–59). */
  minute: number
  /** Local YYYY-MM-DD when repeat is once. */
  date?: string
  /** Local weekdays 0=Sun … 6=Sat when repeat is weekly. */
  daysOfWeek?: number[]
  /** `Date#getTimezoneOffset()` when the schedule was saved. */
  timezoneOffsetMinutes: number
}

const WEEKDAY_DAYS = [1, 2, 3, 4, 5] as const

export function createDefaultTriggerSchedule(
  now: Date = new Date()
): TriggerSchedule {
  const next = new Date(now.getTime() + 60 * 60 * 1000)
  next.setSeconds(0, 0)

  return {
    version: 1,
    repeat: "once",
    hour: next.getHours(),
    minute: next.getMinutes(),
    date: formatLocalDateKey(next),
    daysOfWeek: [...WEEKDAY_DAYS],
    timezoneOffsetMinutes: now.getTimezoneOffset(),
  }
}

export function formatLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseLocalDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim())
  if (!match) {
    return null
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

function isHour(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 23
}

function isMinute(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 59
}

function isDayOfWeek(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 6
}

export function parseTriggerSchedule(value: unknown): TriggerSchedule | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  const raw = value as Record<string, unknown>
  if (raw.version !== 1) {
    return null
  }

  const repeat = raw.repeat
  if (
    repeat !== "once" &&
    repeat !== "daily" &&
    repeat !== "weekdays" &&
    repeat !== "weekly"
  ) {
    return null
  }

  if (!isHour(raw.hour) || !isMinute(raw.minute)) {
    return null
  }

  if (
    typeof raw.timezoneOffsetMinutes !== "number" ||
    !Number.isFinite(raw.timezoneOffsetMinutes)
  ) {
    return null
  }

  const schedule: TriggerSchedule = {
    version: 1,
    repeat,
    hour: raw.hour,
    minute: raw.minute,
    timezoneOffsetMinutes: raw.timezoneOffsetMinutes,
  }

  if (repeat === "once") {
    if (typeof raw.date !== "string" || !parseLocalDateKey(raw.date)) {
      return null
    }
    schedule.date = raw.date
  }

  if (repeat === "weekly") {
    if (!Array.isArray(raw.daysOfWeek) || raw.daysOfWeek.length === 0) {
      return null
    }
    const days = [...new Set(raw.daysOfWeek.filter(isDayOfWeek))].sort(
      (left, right) => left - right
    )
    if (days.length === 0) {
      return null
    }
    schedule.daysOfWeek = days
  }

  return schedule
}

export function isValidTriggerSchedule(value: unknown): boolean {
  return parseTriggerSchedule(value) !== null
}

export function formatTimeLabel(hour: number, minute: number): string {
  const period = hour >= 12 ? "PM" : "AM"
  const hour12 = hour % 12 === 0 ? 12 : hour % 12
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const

export function formatScheduleSummary(schedule: TriggerSchedule): string {
  const time = formatTimeLabel(schedule.hour, schedule.minute)

  if (schedule.repeat === "once") {
    const date = schedule.date ? parseLocalDateKey(schedule.date) : null
    const dateLabel = date
      ? date.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : schedule.date
    return `Once · ${dateLabel} · ${time}`
  }

  if (schedule.repeat === "daily") {
    return `Every day · ${time}`
  }

  if (schedule.repeat === "weekdays") {
    return `Weekdays · ${time}`
  }

  const days = (schedule.daysOfWeek ?? [])
    .map((day) => DAY_LABELS[day] ?? String(day))
    .join(", ")
  return `Weekly · ${days || "—"} · ${time}`
}

export type LocalClockParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  dayOfWeek: number
  dateKey: string
}

/** Convert an absolute instant into wall-clock parts for a stored timezone offset. */
export function getLocalClockParts(
  now: Date,
  timezoneOffsetMinutes: number
): LocalClockParts {
  const local = new Date(now.getTime() - timezoneOffsetMinutes * 60_000)

  const year = local.getUTCFullYear()
  const month = local.getUTCMonth() + 1
  const day = local.getUTCDate()
  const hour = local.getUTCHours()
  const minute = local.getUTCMinutes()
  const dayOfWeek = local.getUTCDay()

  return {
    year,
    month,
    day,
    hour,
    minute,
    dayOfWeek,
    dateKey: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  }
}

/** Absolute UTC instant for a one-time local date + time. */
export function getOnceFiresAtUtc(schedule: TriggerSchedule): Date | null {
  if (schedule.repeat !== "once" || !schedule.date) {
    return null
  }

  const parsed = parseLocalDateKey(schedule.date)
  if (!parsed) {
    return null
  }

  const year = parsed.getFullYear()
  const month = parsed.getMonth()
  const day = parsed.getDate()

  return new Date(
    Date.UTC(year, month, day, schedule.hour, schedule.minute, 0, 0) +
      schedule.timezoneOffsetMinutes * 60_000
  )
}

function floorToMinuteMs(date: Date): number {
  const next = new Date(date)
  next.setUTCSeconds(0, 0)
  return next.getTime()
}

function matchesRepeatDay(
  schedule: TriggerSchedule,
  dayOfWeek: number
): boolean {
  if (schedule.repeat === "daily") {
    return true
  }
  if (schedule.repeat === "weekdays") {
    return WEEKDAY_DAYS.includes(dayOfWeek as (typeof WEEKDAY_DAYS)[number])
  }
  if (schedule.repeat === "weekly") {
    return (schedule.daysOfWeek ?? []).includes(dayOfWeek)
  }
  return false
}

/**
 * True when the schedule should fire for this UTC minute.
 * One-time schedules become due at/after their local date+time.
 */
export function isTriggerScheduleDue(input: {
  schedule: TriggerSchedule
  now: Date
  lastFiredAt: Date | null
}): boolean {
  const { schedule, now, lastFiredAt } = input

  if (schedule.repeat === "once") {
    const firesAt = getOnceFiresAtUtc(schedule)
    if (!firesAt) {
      return false
    }

    if (floorToMinuteMs(now) < floorToMinuteMs(firesAt)) {
      return false
    }

    if (lastFiredAt && floorToMinuteMs(lastFiredAt) >= floorToMinuteMs(firesAt)) {
      return false
    }

    return true
  }

  const local = getLocalClockParts(now, schedule.timezoneOffsetMinutes)
  if (local.hour !== schedule.hour || local.minute !== schedule.minute) {
    return false
  }

  if (!matchesRepeatDay(schedule, local.dayOfWeek)) {
    return false
  }

  if (
    lastFiredAt &&
    floorToMinuteMs(lastFiredAt) >= floorToMinuteMs(now)
  ) {
    return false
  }

  return true
}

export function scheduleSlotKey(
  schedule: TriggerSchedule,
  now: Date
): string {
  if (schedule.repeat === "once") {
    return schedule.date
      ? `once:${schedule.date}T${String(schedule.hour).padStart(2, "0")}:${String(schedule.minute).padStart(2, "0")}`
      : `once:${now.toISOString()}`
  }

  const local = getLocalClockParts(now, schedule.timezoneOffsetMinutes)
  return `${local.dateKey}T${String(local.hour).padStart(2, "0")}:${String(local.minute).padStart(2, "0")}`
}
