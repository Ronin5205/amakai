import { z } from "zod"

import type { DataTableColumn, DataTableColumnType } from "@/lib/domain/data-table"
import {
  TABLE_COLUMN_KEY_MAX_LENGTH,
  TABLE_COLUMN_KEY_PATTERN,
  TABLE_COLUMN_LABEL_MAX_LENGTH,
  TABLE_COLUMN_MAX_COUNT,
  TABLE_COLUMN_MIN_COUNT,
} from "@/lib/validation/limits"
import {
  optionalDescriptionSchema,
  resourceNameSchema,
} from "@/lib/validation/resource-names"
import { formatZodError } from "@/lib/validation/zod-helpers"

const columnTypeSchema = z.enum(["string", "number", "boolean", "json"])

const columnSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1, "Column key is required.")
    .max(
      TABLE_COLUMN_KEY_MAX_LENGTH,
      `Column key must be at most ${TABLE_COLUMN_KEY_MAX_LENGTH} characters.`
    )
    .regex(
      TABLE_COLUMN_KEY_PATTERN,
      "Column key must start with a lowercase letter and use only lowercase letters, numbers, and underscores."
    ),
  label: z
    .string()
    .trim()
    .min(1, "Column label is required.")
    .max(
      TABLE_COLUMN_LABEL_MAX_LENGTH,
      `Column label must be at most ${TABLE_COLUMN_LABEL_MAX_LENGTH} characters.`
    ),
  type: columnTypeSchema,
})

export const saveDataTableInputSchema = z.object({
  id: z.string().min(1),
  name: resourceNameSchema,
  description: optionalDescriptionSchema,
  columns: z
    .array(columnSchema)
    .min(
      TABLE_COLUMN_MIN_COUNT,
      `Tables must have at least ${TABLE_COLUMN_MIN_COUNT} column.`
    )
    .max(
      TABLE_COLUMN_MAX_COUNT,
      `Tables may have at most ${TABLE_COLUMN_MAX_COUNT} columns.`
    )
    .superRefine((columns, ctx) => {
      const keys = new Set<string>()
      for (const [index, column] of columns.entries()) {
        if (keys.has(column.key)) {
          ctx.addIssue({
            code: "custom",
            message: `Duplicate column key "${column.key}".`,
            path: [index, "key"],
          })
        }
        keys.add(column.key)
      }
    }),
})

export type SaveDataTableValidatedInput = z.infer<typeof saveDataTableInputSchema>

export function validateSaveDataTableInput(input: {
  id: string
  name: string
  description?: string
  columns: DataTableColumn[]
}):
  | { ok: true; data: SaveDataTableValidatedInput }
  | { ok: false; error: string } {
  const result = saveDataTableInputSchema.safeParse({
    id: input.id,
    name: input.name.trim() || "Untitled table",
    description: input.description,
    columns: input.columns.map((column) => ({
      key: column.key.trim(),
      label: column.label.trim() || column.key.trim(),
      type: column.type as DataTableColumnType,
    })),
  })

  if (!result.success) {
    return { ok: false, error: formatZodError(result.error) }
  }

  return { ok: true, data: result.data }
}
