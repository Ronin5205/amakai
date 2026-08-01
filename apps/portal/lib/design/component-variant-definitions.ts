import type {
  ConfigSchemaField,
  NodePort,
  WorkflowNode,
} from "@/lib/domain/workflow"
import { buildDefaultSwitchCases } from "@/lib/design/upstream-fields"
import { COMPARISON_OPERATORS } from "@/lib/design/comparison-rules"

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
  const includeDefault = node.config.includeDefaultOutput !== false

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
        "Default",
        "Routes execution when no other case matches.",
        "branch"
      )
    )
  }

  return caseOutputs
}

export const COMPONENT_VARIANT_SPECS: Record<string, ComponentVariantSpec> = {
  "trigger.workflow": {
    catalogItemId: "trigger.workflow",
    inputs: [],
    outputs: [
      output(
        "main-out",
        "Output",
        "Starts the workflow and passes the trigger payload to the next step."
      ),
    ],
    configSchema: [
      {
        key: "triggerType",
        label: "Type",
        type: "select",
        options: [
          { label: "Webhook", value: "webhook" },
          { label: "Schedule", value: "schedule" },
          { label: "Manual", value: "manual" },
        ],
        defaultValue: "manual",
      },
      {
        key: "outputFields",
        label: "Output fields",
        type: "output-fields",
        description:
          "Fields this trigger adds to the payload. Array fields accept comma-separated values in Testing. Use Array for collections consumed by Loop Over Items.",
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
        "input-a",
        "Branch A",
        "First finished path (e.g. true branch or parallel branch A)."
      ),
      input(
        "input-b",
        "Branch B",
        "Second finished path (e.g. false branch or parallel branch B)."
      ),
    ],
    outputs: [
      output(
        "main-out",
        "Combined",
        "Single payload after both branches have completed."
      ),
    ],
    configSchema: [],
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
      config: { caseCount: 2, includeDefaultOutput: true },
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
        label: "Include default output",
        type: "boolean",
        defaultValue: true,
        description:
          "When enabled, unmatched payloads route to Default after all cases are checked.",
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
        "Matching Items",
        "Emits only items that satisfy the filter condition."
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

  return COMPONENT_VARIANT_SPECS[catalogItemId] ?? null
}

export function getCatalogItemId(node: WorkflowNode): string | undefined {
  const fromConfig = node.config.catalogItemId ?? node.config.componentVariant
  return typeof fromConfig === "string" && fromConfig.length > 0
    ? fromConfig
    : undefined
}

export function getDefaultVariantConfig(catalogItemId: string) {
  const spec = COMPONENT_VARIANT_SPECS[catalogItemId]
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
    const includeDefault = config.includeDefaultOutput !== false
    config.switchCases = buildDefaultSwitchCases(caseCount, includeDefault)
  }

  if (catalogItemId === "action.edit-fields") {
    const fieldCount = Math.max(1, Number(config.fieldCount ?? 1))
    config.fieldCount = fieldCount
    config.fieldEdits = normalizeFieldEditRows(config.fieldEdits, fieldCount)
  }

  if (catalogItemId === "trigger.workflow") {
    config.outputFieldDefs = [{ name: "payload", type: "object" }]
    config.outputFields = ["payload"]
    config.outputFieldTypes = { payload: "object" }
  }

  return config
}
