import { z } from "zod"

import type { Workflow, WorkflowNode } from "@/lib/domain/workflow"
import { getCatalogItemId } from "@/lib/design/component-variant-definitions"
import { COMPARISON_OPERATORS } from "@/lib/design/comparison-rules"
import { getIntegrationOperation } from "@/lib/integrations/registry"
import {
  APPROVER_EMAIL_MAX_LENGTH,
  APPROVER_ROLE_MAX_LENGTH,
  CODE_MAX_LENGTH,
  COMPARE_VALUE_MAX_LENGTH,
  EDIT_FIELD_COUNT_MAX,
  EDIT_FIELD_COUNT_MIN,
  ERROR_MESSAGE_MAX_LENGTH,
  FIELD_EDIT_OUTPUT_NAME_MAX_LENGTH,
  FIELD_NAME_PATTERN,
  FIELD_RENAME_NAME_MAX_LENGTH,
  MERGE_INPUT_MAX,
  MERGE_INPUT_MIN,
  NODE_LABEL_MAX_LENGTH,
  OUTPUT_FIELD_MAX_COUNT,
  OUTPUT_FIELD_NAME_MAX_LENGTH,
  RESOURCE_NAME_MAX_LENGTH,
  SWITCH_CASE_MAX,
  SWITCH_CASE_MIN,
  TABLE_COLUMN_KEY_MAX_LENGTH,
  WAIT_DURATION_MS_MAX,
  WAIT_DURATION_MS_MIN,
} from "@/lib/validation/limits"
import { resourceNameSchema } from "@/lib/validation/resource-names"
import { formatZodError } from "@/lib/validation/zod-helpers"

const comparisonOperatorSchema = z.enum(
  COMPARISON_OPERATORS.map((entry) => entry.value) as [
    (typeof COMPARISON_OPERATORS)[number]["value"],
    ...(typeof COMPARISON_OPERATORS)[number]["value"][],
  ]
)

function optionalBoundedString(max: number, label: string) {
  return z
    .string()
    .max(max, `${label} must be at most ${max} characters.`)
    .optional()
}

function optionalFieldName(max: number, label: string) {
  return z
    .string()
    .max(max, `${label} must be at most ${max} characters.`)
    .regex(
      FIELD_NAME_PATTERN,
      `${label} must start with a letter or underscore and use only letters, numbers, and underscores.`
    )
    .or(z.literal(""))
    .optional()
}

const outputFieldDefSchema = z.object({
  name: optionalFieldName(OUTPUT_FIELD_NAME_MAX_LENGTH, "Output field name"),
  type: z.enum(["string", "array", "object"]).optional().default("string"),
})

const switchCaseRuleSchema = z.object({
  portId: z.string(),
  label: optionalBoundedString(64, "Case label"),
  field: optionalBoundedString(256, "Case field"),
  operator: comparisonOperatorSchema.optional(),
  compareValue: optionalBoundedString(COMPARE_VALUE_MAX_LENGTH, "Compare value"),
})

const fieldEditRowSchema = z.object({
  name: optionalFieldName(
    FIELD_EDIT_OUTPUT_NAME_MAX_LENGTH,
    "Output name"
  ),
  sourceField: optionalBoundedString(256, "Source field"),
})

const fieldRenameRowSchema = z.object({
  sourceField: optionalBoundedString(256, "Source field"),
  targetName: optionalFieldName(
    FIELD_RENAME_NAME_MAX_LENGTH,
    "Target name"
  ),
})

const tableColumnMapRowSchema = z.object({
  columnKey: optionalBoundedString(TABLE_COLUMN_KEY_MAX_LENGTH, "Column key"),
  sourceField: optionalBoundedString(256, "Source field"),
})

const triggerConfigSchema = z
  .object({
    triggerType: z.enum(["webhook", "schedule", "manual"]).optional(),
    outputFieldDefs: z.array(outputFieldDefSchema).optional(),
  })
  .superRefine((config, ctx) => {
    const defs = config.outputFieldDefs ?? []
    if (defs.length > OUTPUT_FIELD_MAX_COUNT) {
      ctx.addIssue({
        code: "custom",
        message: `Triggers may define at most ${OUTPUT_FIELD_MAX_COUNT} output fields.`,
        path: ["outputFieldDefs"],
      })
    }

    const names = new Set<string>()
    for (const [index, field] of defs.entries()) {
      if (!field.name) {
        continue
      }
      const key = field.name.toLowerCase()
      if (names.has(key)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate output field "${field.name}".`,
          path: ["outputFieldDefs", index, "name"],
        })
      }
      names.add(key)
    }
  })

const codeConfigSchema = z.object({
  language: z.enum(["javascript", "python"]).optional(),
  code: optionalBoundedString(CODE_MAX_LENGTH, "Code"),
})

const dataTableConfigSchema = z.object({
  operation: z.enum(["read", "write"]).optional(),
  tableName: optionalBoundedString(RESOURCE_NAME_MAX_LENGTH, "Table name"),
  enableFind: z.boolean().optional(),
  findColumn: optionalBoundedString(64, "Find column"),
  findOperator: comparisonOperatorSchema.optional(),
  findValue: optionalBoundedString(COMPARE_VALUE_MAX_LENGTH, "Find value"),
  findValueField: optionalBoundedString(256, "Find value field"),
  writeMode: z.enum(["insert", "upsert"]).optional(),
  matchColumn: optionalBoundedString(64, "Match column"),
  matchValueField: optionalBoundedString(256, "Match value field"),
  columnMappings: z.array(tableColumnMapRowSchema).optional(),
})

const dateTimeConfigSchema = z.object({
  operation: z.enum(["format", "parse", "add"]).optional(),
  sourceField: optionalBoundedString(256, "Date field"),
})

const editFieldsConfigSchema = z.object({
  fieldCount: z.coerce
    .number()
    .int()
    .min(EDIT_FIELD_COUNT_MIN)
    .max(EDIT_FIELD_COUNT_MAX)
    .optional(),
  fieldEdits: z.array(fieldEditRowSchema).optional(),
})

const mergeConfigSchema = z.object({
  inputCount: z.coerce
    .number()
    .int()
    .min(MERGE_INPUT_MIN)
    .max(MERGE_INPUT_MAX)
    .optional(),
})

const aggregateConfigSchema = z.object({
  itemsField: optionalBoundedString(256, "Items list field"),
  groupByField: optionalBoundedString(256, "Group by field"),
})

const renameKeysConfigSchema = z.object({
  renames: z.array(fieldRenameRowSchema).optional(),
})

const sortConfigSchema = z.object({
  sortField: optionalBoundedString(256, "Sort field"),
  direction: z.enum(["asc", "desc"]).optional(),
})

const comparisonConfigSchema = z.object({
  field: optionalBoundedString(256, "Field"),
  operator: comparisonOperatorSchema.optional(),
  compareValue: optionalBoundedString(COMPARE_VALUE_MAX_LENGTH, "Compare value"),
})

const switchConfigSchema = z.object({
  caseCount: z.coerce
    .number()
    .int()
    .min(SWITCH_CASE_MIN)
    .max(SWITCH_CASE_MAX)
    .optional(),
  includeDefaultOutput: z.boolean().optional(),
  switchCases: z.array(switchCaseRuleSchema).optional(),
})

const loopOverItemsConfigSchema = z.object({
  collectionField: optionalBoundedString(256, "Collection field"),
})

const waitConfigSchema = z.object({
  durationMs: z.coerce
    .number()
    .int()
    .min(WAIT_DURATION_MS_MIN)
    .max(WAIT_DURATION_MS_MAX)
    .optional(),
})

const approvalConfigSchema = z
  .object({
    approverType: z.enum(["manual", "email", "role"]).optional(),
    approverEmail: optionalBoundedString(
      APPROVER_EMAIL_MAX_LENGTH,
      "Approver email"
    ),
    approverRole: optionalBoundedString(
      APPROVER_ROLE_MAX_LENGTH,
      "Approver role"
    ),
  })
  .superRefine((config, ctx) => {
    if (config.approverType !== "email" || !config.approverEmail) {
      return
    }

    const emailResult = z.email().safeParse(config.approverEmail)
    if (!emailResult.success) {
      ctx.addIssue({
        code: "custom",
        message: "Approver email must be a valid email address.",
        path: ["approverEmail"],
      })
    }
  })

const stopAndErrorConfigSchema = z.object({
  errorMessage: optionalBoundedString(
    ERROR_MESSAGE_MAX_LENGTH,
    "Error message"
  ),
})

const externalToolConfigSchema = z
  .object({
    service: optionalBoundedString(64, "Service"),
    provider: optionalBoundedString(64, "Provider"),
    operation: optionalBoundedString(64, "Operation"),
    authMode: z.enum(["secret", "public", "none"]).optional(),
    secretName: optionalBoundedString(RESOURCE_NAME_MAX_LENGTH, "Secret"),
    toField: optionalBoundedString(256, "To field"),
    subjectField: optionalBoundedString(256, "Subject field"),
    subjectText: optionalBoundedString(512, "Subject text"),
    bodyField: optionalBoundedString(256, "Body field"),
    bodyText: optionalBoundedString(CODE_MAX_LENGTH, "Body text"),
    outputFieldDefs: z.array(outputFieldDefSchema).optional(),
  })
  .passthrough()

const apiTriggerConfigSchema = z
  .object({
    triggerMode: z
      .enum(["webhook", "schedule", "manual", "signal"])
      .optional(),
    webhookToken: optionalBoundedString(128, "Webhook token"),
    authMode: z.enum(["none", "secret", "public"]).optional(),
    secretName: optionalBoundedString(RESOURCE_NAME_MAX_LENGTH, "Secret"),
    publicApiKey: optionalBoundedString(512, "Public API key"),
    outputFieldDefs: z.array(outputFieldDefSchema).optional(),
  })
  .passthrough()

const httpRequestConfigSchema = z
  .object({
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
    urlField: optionalBoundedString(256, "URL field"),
    urlText: optionalBoundedString(2048, "URL"),
    authMode: z.enum(["secret", "public", "none"]).optional(),
    secretName: optionalBoundedString(RESOURCE_NAME_MAX_LENGTH, "Secret"),
    publicApiKey: optionalBoundedString(2048, "Public API key"),
    headersJson: optionalBoundedString(CODE_MAX_LENGTH, "Headers JSON"),
    bodyField: optionalBoundedString(256, "Body field"),
    bodyText: optionalBoundedString(CODE_MAX_LENGTH, "Body text"),
    timeoutMs: z.coerce.number().int().min(1000).max(60_000).optional(),
  })
  .passthrough()

const NODE_CONFIG_SCHEMAS: Record<string, z.ZodTypeAny> = {
  "trigger.workflow": triggerConfigSchema,
  "trigger.external-tool": externalToolConfigSchema,
  "trigger.api": apiTriggerConfigSchema,
  "integrations.external-tool": externalToolConfigSchema,
  "integrations.http-request": httpRequestConfigSchema,
  "action.code": codeConfigSchema,
  "action.data-table": dataTableConfigSchema,
  "action.date-time": dateTimeConfigSchema,
  "action.edit-fields": editFieldsConfigSchema,
  "action.merge": mergeConfigSchema,
  "action.aggregate": aggregateConfigSchema,
  "action.rename-keys": renameKeysConfigSchema,
  "action.sort": sortConfigSchema,
  "condition.if": comparisonConfigSchema,
  "condition.switch": switchConfigSchema,
  "condition.filter": comparisonConfigSchema,
  "loop.over-items": loopOverItemsConfigSchema,
  "loop.wait": waitConfigSchema,
  "approval.base": approvalConfigSchema,
  "exception.stop-and-error": stopAndErrorConfigSchema,
}

const nodeLabelSchema = z
  .string()
  .trim()
  .max(
    NODE_LABEL_MAX_LENGTH,
    `Node label must be at most ${NODE_LABEL_MAX_LENGTH} characters.`
  )

/** Lenient checks for draft auto-save (lengths, patterns). Incomplete nodes are allowed. */
export function validateNodeConfig(
  node: WorkflowNode
): { ok: true } | { ok: false; error: string } {
  const catalogItemId = getCatalogItemId(node)
  if (!catalogItemId) {
    return { ok: true }
  }

  const schema = NODE_CONFIG_SCHEMAS[catalogItemId]
  if (schema) {
    const result = schema.safeParse(node.config)
    if (!result.success) {
      const label = node.label.trim() || catalogItemId
      return {
        ok: false,
        error: `${label}: ${formatZodError(result.error)}`,
      }
    }
  }

  return { ok: true }
}

/** Stricter checks before playground validation or deploy (integration wiring required). */
export function validateNodeConfigForRun(
  node: WorkflowNode
): { ok: true } | { ok: false; error: string } {
  const draftResult = validateNodeConfig(node)
  if (!draftResult.ok) {
    return draftResult
  }

  const catalogItemId = getCatalogItemId(node)
  if (
    catalogItemId === "trigger.external-tool" ||
    catalogItemId === "integrations.external-tool"
  ) {
    const service = String(node.config.service ?? "")
    const provider = String(node.config.provider ?? "")
    const operation = String(node.config.operation ?? "")
    if (!service || !provider || !operation) {
      return {
        ok: false,
        error: `${node.label.trim() || catalogItemId}: Select a service, provider, and operation.`,
      }
    }

    const op = getIntegrationOperation(service, provider, operation)
    if (!op) {
      return {
        ok: false,
        error: `${node.label.trim() || catalogItemId}: Unknown integration operation.`,
      }
    }
    if (op.nodeKind === "trigger" && node.kind !== "trigger") {
      return {
        ok: false,
        error: `${node.label.trim() || catalogItemId}: Operation "${operation}" requires a trigger node.`,
      }
    }
    if (op.nodeKind === "sequential" && node.kind !== "sequential") {
      return {
        ok: false,
        error: `${node.label.trim() || catalogItemId}: Operation "${operation}" requires an action node.`,
      }
    }
    const validation = op.validate(node.config)
    if (!validation.ok) {
      return {
        ok: false,
        error: `${node.label.trim() || catalogItemId}: ${validation.message}`,
      }
    }
  }

  if (catalogItemId === "integrations.http-request") {
    const op = getIntegrationOperation("api", "rest", "request")
    const validation = op?.validate(node.config)
    if (validation && !validation.ok) {
      return {
        ok: false,
        error: `${node.label.trim() || catalogItemId}: ${validation.message}`,
      }
    }
  }

  return { ok: true }
}

export function validateWorkflowDraft(
  workflow: Workflow
): { ok: true; name: string } | { ok: false; error: string } {
  const nameResult = resourceNameSchema.safeParse(
    workflow.name.trim() || "Untitled workflow"
  )
  if (!nameResult.success) {
    return { ok: false, error: formatZodError(nameResult.error) }
  }

  for (const node of workflow.nodes) {
    const labelResult = nodeLabelSchema.safeParse(node.label)
    if (!labelResult.success) {
      return {
        ok: false,
        error: formatZodError(labelResult.error),
      }
    }

    const configResult = validateNodeConfig(node)
    if (!configResult.ok) {
      return configResult
    }
  }

  return { ok: true, name: nameResult.data }
}

export function clampNodeConfigString(key: string, value: string): string {
  const maxByKey: Record<string, number> = {
    code: CODE_MAX_LENGTH,
    compareValue: COMPARE_VALUE_MAX_LENGTH,
    findValue: COMPARE_VALUE_MAX_LENGTH,
    errorMessage: ERROR_MESSAGE_MAX_LENGTH,
    approverEmail: APPROVER_EMAIL_MAX_LENGTH,
    approverRole: APPROVER_ROLE_MAX_LENGTH,
    tableName: RESOURCE_NAME_MAX_LENGTH,
  }

  const max = maxByKey[key]
  if (max !== undefined && value.length > max) {
    return value.slice(0, max)
  }

  return value
}

export function clampNodeConfigNumber(key: string, value: number): number {
  if (key === "fieldCount") {
    return Math.min(
      EDIT_FIELD_COUNT_MAX,
      Math.max(EDIT_FIELD_COUNT_MIN, Math.floor(value))
    )
  }
  if (key === "inputCount") {
    return Math.min(
      MERGE_INPUT_MAX,
      Math.max(MERGE_INPUT_MIN, Math.floor(value))
    )
  }
  if (key === "caseCount") {
    return Math.min(
      SWITCH_CASE_MAX,
      Math.max(SWITCH_CASE_MIN, Math.floor(value))
    )
  }
  if (key === "durationMs") {
    return Math.min(
      WAIT_DURATION_MS_MAX,
      Math.max(WAIT_DURATION_MS_MIN, Math.floor(value))
    )
  }
  return value
}

export function clampOutputFieldName(name: string): string {
  const trimmed = name.trim()
  if (trimmed.length <= OUTPUT_FIELD_NAME_MAX_LENGTH) {
    return trimmed
  }
  return trimmed.slice(0, OUTPUT_FIELD_NAME_MAX_LENGTH)
}
