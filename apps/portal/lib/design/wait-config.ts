import {
  WAIT_DURATION_MS_MAX,
  WAIT_DURATION_MS_MIN,
} from "@/lib/validation/limits"

export function getWaitDurationMs(config: Record<string, unknown>) {
  const durationMs = Number(config.durationMs ?? 1000)

  if (!Number.isFinite(durationMs)) {
    return 1000
  }

  return Math.min(
    WAIT_DURATION_MS_MAX,
    Math.max(WAIT_DURATION_MS_MIN, Math.floor(durationMs))
  )
}

export function formatWaitDuration(durationMs: number) {
  if (durationMs < 1000) {
    return `${durationMs}ms`
  }

  if (durationMs < 60_000) {
    const seconds = durationMs / 1000
    return Number.isInteger(seconds) ? `${seconds}s` : `${seconds.toFixed(1)}s`
  }

  const minutes = Math.floor(durationMs / 60_000)
  const seconds = Math.round((durationMs % 60_000) / 1000)

  if (seconds === 0) {
    return `${minutes}m`
  }

  return `${minutes}m ${seconds}s`
}
