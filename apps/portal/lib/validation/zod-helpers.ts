import type { ZodError } from "zod"

export function formatZodError(error: ZodError): string {
  const messages = error.issues.map((issue) => issue.message)
  return [...new Set(messages)].join(" ")
}

export function parseOrThrow<T>(
  result: { success: true; data: T } | { success: false; error: ZodError }
): T {
  if (!result.success) {
    throw new Error(formatZodError(result.error))
  }
  return result.data
}
