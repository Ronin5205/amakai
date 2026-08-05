import type {
  ConfigSchemaField,
  NodePort,
  WorkflowNode,
} from "@/lib/domain/workflow"
import { buildDefaultSwitchCases } from "@/lib/design/upstream-fields"
import { COMPARISON_OPERATORS } from "@/lib/design/comparison-rules"
import {
  defaultOutputFieldsForTriggerMode,
  TRIGGER_MODE_OPTIONS,
  UNIFIED_TRIGGER_CATALOG_ID,
  isUnifiedTriggerCatalogId,
  resolveCanonicalTriggerCatalogId,
} from "@/lib/design/trigger-config"

export type ComponentVariantSpec = {
  catalogItemId: string
  inputs: NodePort[]
  outputs: NodePort[]
  configSchema?: ConfigSchemaField[]
  resolvePorts?: (node: WorkflowNode) => {
    inputs: NodePort[]
    outputs: NodePort[]
  }
}

function input(
  id: string,
  label: string,
  description: string,
  required = true
): NodePort {
  return { id, label, type: "main", required, description }
}

function output(
  id: string,
  label: string,
  description: string,
  type: NodePort["type"] = "main"
): NodePort {
  return { id, label, type, description }
}

const STANDARD_INPUT = input(
  "main-in",
  "Input",
  "Receives data from the previous step in the workflow."
)

const STANDARD_OUTPUT = output(
  "main-out",
  "Output",
  "Passes processed data to the next connected step."
)

import {
  buildEditFieldPorts,
  normalizeFieldEditRows,
} from "@/lib/design/edit-fields"

function buildSwitchOutputs(node: WorkflowNode): NodePort[] {
  const caseCount = Math.max(2, Number(node.config.caseCount ?? 2))
  const includeDefault = node.config.includeDefaultOutput === true

  const caseOutputs = Array.from({ length: caseCount }, (_, index) => {
    const caseNumber = index + 1
    return output(
      `case-${caseNumber}`,
      `Case ${caseNumber}`,
      `Routes execution when the Case ${caseNumber} rule matches.`,
      "branch"
    )
  })

  if (includeDefault) {
    caseOutputs.push(
      output(
        "default",
        "Fallback",
        "Routes execution when no other case matches.",
        "branch"
      )
    )
  }

  return caseOutputs
}

const MERGE_INPUT_MIN = 2
const MERGE_INPUT_MAX = 8

export function getMergeInputCount(node: WorkflowNode) {
  const raw = Number(node.config.inputCount ?? MERGE_INPUT_MIN)
  if (!Number.isFinite(raw)) {
    return MERGE_INPUT_MIN
  }
  return Math.min(MERGE_INPUT_MAX, Math.max(MERGE_INPUT_MIN, Math.floor(raw)))
}

export function mergePortId(index: number) {
  return `input-${index}`
}

/** Maps legacy Merge edge ports to modern input-N ids. */
export function normalizeMergePortId(portId: string | undefined) {
  if (!portId || portId === "main-in") {
    return mergePortId(1)
  }
  if (portId === "input-a") {
    return mergePortId(1)
  }
  if (portId === "input-b") {
    return mergePortId(2)
  }
  return portId
}

function buildMergeInputs(node: WorkflowNode): NodePort[] {
  const count = getMergeInputCount(node)
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1
    return input(
      mergePortId(n),
      `Input ${n}`,
      `Incoming branch ${n}. Merge waits for every configured input before firing.`
    )
  })
}

const UNIFIED_TRIGGER_CONFIG_SCHEMA: ConfigSchemaField[] = [
  {
    key: "triggerMode",
    label: "Mode",
    type: "select",
    options: TRIGGER_MODE_OPTIONS.map((option) => ({ ...option })),
    defaultValue: "manual",
    description:
      "How this workflow starts: manually, on a schedule, via webhook/signal, or from an external tool.",
  },
  {
    key: "schedule",
    label: "Schedule",
    type: "schedule-picker",
    description: "Pick a date and exact time, once or on a loop.",
  },
  {
    key: "webhookToken",
    label: "Webhook token",
    type: "string",
    description: "Auto-filled on deploy. Public URL: /api/webhooks/{token}",
  },
  {
    key: "authMode",
    label: "Webhook auth",
    type: "select",
    options: [
      { label: "None", value: "none" },
      { label: "Secret (HMAC / signing)", value: "secret" },
      { label: "Public header key", value: "public" },
    ],
    defaultValue: "none",
  },
  {
    key: "secretName",
    label: "Signing secret",
    type: "secret-select",
    secretKinds: ["webhook_signing", "api_key"],
  },
  {
    key: "publicApiKey",
    label: "Public header value",
    type: "string",
    description: "Compared to X-Amakai-Key when auth is Public.",
  },
  {
    key: "integration",
    label: "Service / provider / operation",
    type: "integration-config",
    description: "Inbound external tool that starts this workflow.",
  },
  {
    key: "outputFields",
    label: "Output fields",
    type: "output-fields",
    description:
      "Fields this trigger adds to the payload. Array fields accept comma-separated values in Testing.",
  },
]

const UNIFIED_TRIGGER_SPEC: ComponentVariantSpec = {
  catalogItemId: UNIFIED_TRIGGER_CATALOG_ID,
  inputs: [],
  outputs: [
    output(
      "main-out",
      "Output",
      "Starts the workflow and passes the trigger payload to the next step."
    ),
  ],
  configSchema: UNIFIED_TRIGGER_CONFIG_SCHEMA,
}

export const COMPONENT_VARIANT_SPECS: Record<string, ComponentVariantSpec> = {
  "trigger.workflow": UNIFIED_TRIGGER_SPEC,
  // Legacy aliases — same ports/schema; mode inferred via normalizeTriggerMode.
  "trigger.api": {
    ...UNIFIED_TRIGGER_SPEC,
    catalogItemId: "trigger.api",
  },
  "trigger.external-tool": {
    ...UNIFIED_TRIGGER_SPEC,
    catalogItemId: "trigger.external-tool",
  },
  "integrations.external-tool": {
    catalogItemId: "integrations.external-tool",
    inputs: [STANDARD_INPUT],
    outputs: [STANDARD_OUTPUT],
    configSchema: [
      {
        key: "integration",
        label: "Service / provider / operation",
        type: "integration-config",
      },
    ],
  },
  "integrations.http-request": {
    catalogItemId: "integrations.http-request",
    inputs: [STANDARD_INPUT],
    outputs: [STANDARD_OUTPUT],
    configSchema: [
      {
        key: "method",
        label: "Method",
        type: "select",
        options: [
          { label: "GET", value: "GET" },
          { label: "POST", value: "POST" },
          { label: "PUT", value: "PUT" },
          { label: "PATCH", value: "PATCH" },
          { label: "DELETE", value: "DELETE" },
        ],
        defaultValue: "GET",
      },
      {
        key: "urlText",
        label: "URL",
        type: "string",
      },
    ],
  },
  "action.code": {
    catalogItemId: "action.code",
    inputs: [STANDARD_INPUT],
    outputs: [STANDARD_OUTPUT],
    configSchema: [
      {
        key: "language",
        label: "Language",
        type: "select",
        options: [
          { label: "JavaScript", value: "javascript" },
          { label: "Python", value: "python" },
        ],
        defaultValue: "javascript",
      },
      {
        key: "code",
        label: "Code",
        type: "code",
        required: true,
      },
    ],
  },
  "action.data-table": {
    catalogItemId: "action.data-table",
    inputs: [STANDARD_INPUT],
    outputs: [STANDARD_OUTPUT],
    configSchema: [
      {
        key: "operation",
        label: "Operation",
        type: "select",
        options: [
          { label: "Read", value: "read" },
          { label: "Write", value: "write" },
        ],
        defaultValue: "read",
      },
      {
        key: "tableName",
        label: "Table",
        type: "table-select",
        required: true,
        description: "Select a table by name from Design → Tables.",
      },
      {
        key: "enableFind",
        label: "Find rows",
        type: "boolean",
        defaultValue: false,
        description:
          "When enabled, return only rows that match the find criteria instead of all rows.",
      },
      {
        key: "findColumn",
        label: "Find column",
        type: "table-column-select",
        description: "Table column to compare when finding rows.",
      },
      {
        key: "findOperator",
        label: "Find operator",
        type: "select",
        options: [...COMPARISON_OPERATORS],
        defaultValue: "equals",
        description: "Predefined comparison — no JavaScript expressions.",
      },
      {
        key: "findValue",
        label: "Find value",
        type: "string",
        description:
          "Static value to compare. Leave empty to use the upstream field below instead.",
      },
      {
        key: "findValueField",
        label: "Find value field",
        type: "upstream-field",
        description:
          "Optional upstream field to use as the find value instead of a static value.",
      },
      {
        key: "writeMode",
        label: "Write mode",
        type: "select",
        options: [
          { label: "Insert new row", value: "insert" },
          { label: "Upsert (update or insert)", value: "upsert" },
        ],
        defaultValue: "insert",
        description:
          "Upsert finds an existing row by match column and updates it; otherwise inserts a new row.",
      },
      {
        key: "matchColumn",
        label: "Match column",
        type: "table-column-select",
        description: "For upsert: column used to find the existing row.",
      },
      {
        key: "matchValueField",
        label: "Match value field",
        type: "upstream-field",
        description:
          "For upsert: upstream field whose value is compared against the match column.",
      },
      {
        key: "columnMappings",
        label: "Column mappings",
        type: "table-column-map",
        description:
          "For write operations, map each table column to a field from the previous node.",
      },
    ],
  },
  "action.date-time": {
    catalogItemId: "action.date-time",
    inputs: [STANDARD_INPUT],
    outputs: [STANDARD_OUTPUT],
    configSchema: [
      {
        key: "operation",
        label: "Operation",
        type: "select",
        options: [
          { label: "Format", value: "format" },
          { label: "Parse", value: "parse" },
          { label: "Add interval", value: "add" },
        ],
        defaultValue: "format",
      },
      {
        key: "sourceField",
        label: "Date field",
        type: "upstream-field",
        required: true,
        description: "Date or time value from the previous node.",
      },
    ],
  },
  "action.edit-fields": {
    catalogItemId: "action.edit-fields",
    inputs: [STANDARD_INPUT],
    outputs: [STANDARD_OUTPUT],
    configSchema: [
      {
        key: "fieldCount",
        label: "Field mappings",
        type: "number",
        defaultValue: 1,
        description:
          "Number of input/output pairs. Each pair maps one upstream value to one output field.",
      },
      {
        key: "fieldEdits",
        label: "Mappings",
        type: "field-edit-table",
        description:
          "For each row: pick a source field (input) and name the edited output field.",
      },
    ],
    resolvePorts: (node) => buildEditFieldPorts(node),
  },
  "action.merge": {
    catalogItemId: "action.merge",
    inputs: [
      input(
        "input-1",
        "Input 1",
        "Incoming branch 1. Merge waits for every configured input before firing."
      ),
      input(
        "input-2",
        "Input 2",
        "Incoming branch 2. Merge waits for every configured input before firing."
      ),
    ],
    outputs: [
      output(
        "main-out",
        "Output",
        "Single payload after all configured inputs have completed."
      ),
    ],
    configSchema: [
      {
        key: "inputCount",
        label: "Number of Inputs",
        type: "number",
        defaultValue: 2,
        description:
          "How many branches to synchronize (2–8). Merge waits for all connected inputs before firing.",
      },
    ],
    resolvePorts: (node) => ({
      inputs: buildMergeInputs(node),
      outputs: [
        output(
          "main-out",
          "Output",
          "Single payload after all configured inputs have completed."
        ),
      ],
    }),
  },
  "action.aggregate": {
    catalogItemId: "action.aggregate",
    inputs: [STANDARD_INPUT],
    outputs: [STANDARD_OUTPUT],
    configSchema: [
      {
        key: "itemsField",
        label: "Items list",
        type: "upstream-field",
        description:
          "Optional. Array field to group (e.g. orders, dataTableRows). Auto-detected when empty.",
      },
      {
        key: "groupByField",
        label: "Group by field",
        type: "upstream-field",
        required: true,
        description:
          "Property on each item used as the group key — like SQL GROUP BY.",
      },
    ],
  },
  "action.rename-keys": {
    catalogItemId: "action.rename-keys",
    inputs: [STANDARD_INPUT],
    outputs: [STANDARD_OUTPUT],
    configSchema: [
      {
        key: "renames",
        label: "Renames",
        type: "field-rename-table",
        description: "Select fields from the previous node and rename them.",
      },
    ],
  },
  "action.sort": {
    catalogItemId: "action.sort",
    inputs: [STANDARD_INPUT],
    outputs: [STANDARD_OUTPUT],
    configSchema: [
      {
        key: "sortField",
        label: "Sort by",
        type: "upstream-field",
        required: true,
      },
      {
        key: "direction",
        label: "Direction",
        type: "select",
        options: [
          { label: "Ascending", value: "asc" },
          { label: "Descending", value: "desc" },
        ],
        defaultValue: "asc",
      },
    ],
  },
  "condition.if": {
    catalogItemId: "condition.if",
    inputs: [STANDARD_INPUT],
    outputs: [
      output(
        "true",
        "True",
        "Routes execution when the rule matches.",
        "branch"
      ),
      output(
        "false",
        "False",
        "Routes execution when the rule does not match.",
        "branch"
      ),
    ],
    configSchema: [
      {
        key: "field",
        label: "Field",
        type: "upstream-field",
        required: true,
      },
      {
        key: "operator",
        label: "Operator",
        type: "select",
        options: [...COMPARISON_OPERATORS],
        defaultValue: "equals",
        description: "Predefined comparison — no JavaScript expressions.",
      },
      {
        key: "compareValue",
        label: "Value",
        type: "string",
        required: true,
      },
    ],
  },
  "condition.switch": {
    catalogItemId: "condition.switch",
    inputs: [STANDARD_INPUT],
    outputs: buildSwitchOutputs({
      id: "",
      label: "",
      kind: "conditional",
      config: { caseCount: 2, includeDefaultOutput: false },
    }),
    configSchema: [
      {
        key: "caseCount",
        label: "Cases",
        type: "number",
        defaultValue: 2,
        description: "Number of named outputs evaluated top to bottom.",
      },
      {
        key: "includeDefaultOutput",
        label: "Include fallback output",
        type: "boolean",
        defaultValue: false,
        description:
          "When enabled, unmatched payloads route to Fallback after all cases are checked. Off by default.",
      },
      {
        key: "switchCases",
        label: "Case rules",
        type: "switch-rules",
        description:
          "Each case compares one upstream JSON field using a predefined operator (equals, contains, greater than, etc.). No JavaScript or custom expressions — the first matching case wins.",
      },
    ],
    resolvePorts: (node) => ({
      inputs: [STANDARD_INPUT],
      outputs: buildSwitchOutputs(node),
    }),
  },
  "condition.filter": {
    catalogItemId: "condition.filter",
    inputs: [STANDARD_INPUT],
    outputs: [
      output(
        "matching-items",
        "Kept",
        "Emits only payloads that satisfy the filter condition. Non-matching payloads are dropped."
      ),
    ],
    configSchema: [
      {
        key: "field",
        label: "Field",
        type: "upstream-field",
        required: true,
      },
      {
        key: "operator",
        label: "Operator",
        type: "select",
        options: [...COMPARISON_OPERATORS],
        defaultValue: "equals",
        description: "Predefined comparison — no JavaScript expressions.",
      },
      {
        key: "compareValue",
        label: "Value",
        type: "string",
        required: true,
      },
    ],
  },
  "loop.over-items": {
    catalogItemId: "loop.over-items",
    inputs: [STANDARD_INPUT],
    outputs: [
      output(
        "loop",
        "Loop",
        "Fires once for each batch or item in the collection."
      ),
      output(
        "done",
        "Done",
        "Fires after every iteration has completed."
      ),
    ],
    configSchema: [
      {
        key: "collectionField",
        label: "Collection field",
        type: "upstream-field",
        required: true,
        description:
          "Array or list field from the previous node. Accepts JSON arrays, comma-separated values, or single objects.",
      },
    ],
  },
  "loop.wait": {
    catalogItemId: "loop.wait",
    inputs: [STANDARD_INPUT],
    outputs: [
      output(
        "resume",
        "Resume",
        "Continues execution after the wait interval has elapsed."
      ),
    ],
    configSchema: [
      {
        key: "durationMs",
        label: "Wait (ms)",
        type: "number",
        defaultValue: 1000,
        description:
          "Pauses execution until the configured duration has elapsed, then continues on Resume.",
      },
    ],
  },
  "approval.base": {
    catalogItemId: "approval.base",
    inputs: [STANDARD_INPUT],
    outputs: [
      output(
        "approved",
        "Approved",
        "Continues when the request is approved.",
        "branch"
      ),
      output(
        "rejected",
        "Rejected",
        "Continues when the request is rejected.",
        "branch"
      ),
    ],
    configSchema: [
      {
        key: "approverType",
        label: "Approval type",
        type: "select",
        defaultValue: "manual",
        options: [
          { label: "Manual (portal)", value: "manual" },
          { label: "Email", value: "email" },
          { label: "Role", value: "role" },
        ],
        description:
          "How the approver is assigned. Manual pauses until someone approves in the portal.",
      },
      {
        key: "approverEmail",
        label: "Approver email",
        type: "string",
        placeholder: "approver@company.com",
      },
      {
        key: "approverRole",
        label: "Approver role",
        type: "string",
        placeholder: "Manager",
      },
    ],
  },
  "exception.stop-and-error": {
    catalogItemId: "exception.stop-and-error",
    inputs: [
      input(
        "main-in",
        "Input",
        "Receives the payload before the workflow is terminated."
      ),
    ],
    outputs: [],
    configSchema: [
      {
        key: "errorMessage",
        label: "Error message",
        type: "string",
      },
    ],
  },
}

export function getComponentVariantSpec(
  catalogItemId: string | undefined
): ComponentVariantSpec | null {
  if (!catalogItemId) {
    return null
  }

  const canonical = resolveCanonicalTriggerCatalogId(catalogItemId) ?? catalogItemId
  return COMPONENT_VARIANT_SPECS[catalogItemId] ?? COMPONENT_VARIANT_SPECS[canonical] ?? null
}

export function getCatalogItemId(node: WorkflowNode): string | undefined {
  const fromConfig = node.config.catalogItemId ?? node.config.componentVariant
  if (typeof fromConfig !== "string" || fromConfig.length === 0) {
    return undefined
  }
  return resolveCanonicalTriggerCatalogId(fromConfig) ?? fromConfig
}

/** Raw stored catalog id before alias normalization (for migration/inference). */
export function getRawCatalogItemId(node: WorkflowNode): string | undefined {
  const fromConfig = node.config.catalogItemId ?? node.config.componentVariant
  return typeof fromConfig === "string" && fromConfig.length > 0
    ? fromConfig
    : undefined
}

export function getDefaultVariantConfig(catalogItemId: string) {
  const spec = getComponentVariantSpec(catalogItemId)
  if (!spec?.configSchema) {
    return {}
  }

  const config: Record<string, unknown> = {}
  for (const field of spec.configSchema) {
    if (field.defaultValue !== undefined) {
      config[field.key] = field.defaultValue
    }
  }

  if (catalogItemId === "condition.switch") {
    const caseCount = Math.max(2, Number(config.caseCount ?? 2))
    const includeDefault = config.includeDefaultOutput === true
    config.switchCases = buildDefaultSwitchCases(caseCount, includeDefault)
  }

  if (catalogItemId === "action.merge") {
    config.inputCount = getMergeInputCount({
      id: "",
      label: "",
      kind: "sequential",
      config,
    })
  }

  if (catalogItemId === "action.edit-fields") {
    const fieldCount = Math.max(1, Number(config.fieldCount ?? 1))
    config.fieldCount = fieldCount
    config.fieldEdits = normalizeFieldEditRows(config.fieldEdits, fieldCount)
  }

  if (isUnifiedTriggerCatalogId(catalogItemId)) {
    const mode =
      catalogItemId === "trigger.external-tool"
        ? ("integration" as const)
        : catalogItemId === "trigger.api"
          ? ("webhook" as const)
          : ("manual" as const)
    config.triggerMode = mode
    if (mode !== "integration") {
      config.triggerType = mode
    }
    const defs = defaultOutputFieldsForTriggerMode(mode)
    config.outputFieldDefs = defs
    config.outputFields = defs.map((field) => field.name)
    config.outputFieldTypes = Object.fromEntries(
      defs.map((field) => [field.name, field.type])
    )
    if (mode === "integration") {
      config.service = "email"
      config.provider = "gmail"
      config.operation = "receive"
      config.authMode = "secret"
    }
    if (mode === "webhook") {
      config.authMode = config.authMode ?? "none"
      config.webhookToken = crypto.randomUUID()
    }
  }

  return config
}
