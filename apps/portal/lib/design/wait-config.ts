export function getWaitDurationMs(config: Record<string, unknown>) {
  const durationMs = Number(config.durationMs ?? 1000)

  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return 1000
  }

  return durationMs
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
