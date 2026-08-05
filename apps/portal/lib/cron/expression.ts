/**
 * Standard 5-field cron (minute hour day-of-month month day-of-week).
 * Supports star, single values, ranges, steps, and comma lists.
 * Day-of-week: 0-6 (Sun-Sat); 7 also means Sunday.
 */

const FIELD_BOUNDS = [
  { min: 0, max: 59 }, // minute
  { min: 0, max: 23 }, // hour
  { min: 1, max: 31 }, // day of month
  { min: 1, max: 12 }, // month
  { min: 0, max: 7 }, // day of week (7 ≡ 0)
] as const

function parseFieldPart(
  part: string,
  min: number,
  max: number
): number[] | null {
  const values = new Set<number>()

  for (const token of part.split(",")) {
    const trimmed = token.trim()
    if (!trimmed) {
      return null
    }

    const [rangePart, stepPart] = trimmed.split("/")
    const step = stepPart === undefined ? 1 : Number(stepPart)
    if (!Number.isInteger(step) || step < 1) {
      return null
    }

    let start: number
    let end: number

    if (rangePart === "*") {
      start = min
      end = max
    } else if (rangePart.includes("-")) {
      const [rawStart, rawEnd] = rangePart.split("-")
      start = Number(rawStart)
      end = Number(rawEnd)
      if (
        !Number.isInteger(start) ||
        !Number.isInteger(end) ||
        start < min ||
        end > max ||
        start > end
      ) {
        return null
      }
    } else {
      start = Number(rangePart)
      if (!Number.isInteger(start) || start < min || start > max) {
        return null
      }
      end = start
    }

    for (let value = start; value <= end; value += step) {
      values.add(value)
    }
  }

  return [...values]
}

export function parseCronExpression(expression: string): number[][] | null {
  const fields = expression.trim().split(/\s+/)
  if (fields.length !== 5) {
    return null
  }

  const parsed: number[][] = []
  for (let index = 0; index < 5; index += 1) {
    const { min, max } = FIELD_BOUNDS[index]
    const values = parseFieldPart(fields[index], min, max)
    if (!values || values.length === 0) {
      return null
    }
    parsed.push(values)
  }

  return parsed
}

export function isValidCronExpression(expression: string): boolean {
  return parseCronExpression(expression) !== null
}

export function floorToMinute(date: Date): Date {
  const next = new Date(date)
  next.setUTCSeconds(0, 0)
  return next
}

export function cronSlotKey(date: Date): string {
  return floorToMinute(date).toISOString().slice(0, 16)
}

export function cronMatches(expression: string, date: Date): boolean {
  const parsed = parseCronExpression(expression)
  if (!parsed) {
    return false
  }

  const minute = date.getUTCMinutes()
  const hour = date.getUTCHours()
  const dayOfMonth = date.getUTCDate()
  const month = date.getUTCMonth() + 1
  let dayOfWeek = date.getUTCDay() // 0–6

  const [minutes, hours, daysOfMonth, months, daysOfWeek] = parsed

  const dowMatch = daysOfWeek.some(
    (value) => value === dayOfWeek || (value === 7 && dayOfWeek === 0)
  )

  return (
    minutes.includes(minute) &&
    hours.includes(hour) &&
    daysOfMonth.includes(dayOfMonth) &&
    months.includes(month) &&
    dowMatch
  )
}

/**
 * True when `now` matches the cron and we have not already fired for this UTC minute.
 */
export function isCronDue(input: {
  expression: string
  now: Date
  lastFiredAt: Date | null
}): boolean {
  if (!cronMatches(input.expression, input.now)) {
    return false
  }

  if (!input.lastFiredAt) {
    return true
  }

  return (
    floorToMinute(input.lastFiredAt).getTime() <
    floorToMinute(input.now).getTime()
  )
}
