import type {
  ConfigSchemaField,
  NodeDefinition,
  NodeKind,
  NodePort,
} from "@/lib/domain/workflow"

const MAIN_INPUT: NodePort = {
  id: "main-in",
  label: "Input",
  type: "main",
  required: true,
}

const MAIN_OUTPUT: NodePort = {
  id: "main-out",
  label: "Output",
  type: "main",
}

export const NODE_DEFINITIONS: Record<NodeKind, NodeDefinition> = {
  trigger: {
    kind: "trigger",
    label: "Trigger",
    description: "Starts the workflow",
    inputs: [],
    outputs: [MAIN_OUTPUT],
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
        defaultValue: "webhook",
      },
      {
        key: "schedule",
        label: "Schedule",
        type: "string",
        placeholder: "0 9 * * 1-5",
      },
    ],
  },
  sequential: {
    kind: "sequential",
    label: "Action",
    description: "Runs one step",
    inputs: [MAIN_INPUT],
    outputs: [MAIN_OUTPUT],
    configSchema: [],
  },
  parallel: {
    kind: "parallel",
    label: "Parallel",
    description: "Runs branches together",
    inputs: [MAIN_INPUT],
    outputs: [
      { id: "branch-a", label: "Branch A", type: "branch" },
      { id: "branch-b", label: "Branch B", type: "branch" },
      { id: "branch-c", label: "Branch C", type: "branch" },
    ],
    configSchema: [
      {
        key: "maxConcurrency",
        label: "Branches",
        type: "number",
        defaultValue: 3,
      },
    ],
  },
  conditional: {
    kind: "conditional",
    label: "Condition",
    description: "Branches on a rule",
    inputs: [MAIN_INPUT],
    outputs: [
      { id: "true", label: "True", type: "branch" },
      { id: "false", label: "False", type: "branch" },
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
        options: [
          { label: "equals", value: "equals" },
          { label: "not equals", value: "not_equals" },
          { label: "greater than", value: "greater_than" },
          { label: "less than", value: "less_than" },
          { label: "contains", value: "contains" },
        ],
        defaultValue: "equals",
      },
      {
        key: "compareValue",
        label: "Value",
        type: "string",
        required: true,
      },
    ],
  },
  loop: {
    kind: "loop",
    label: "Loop",
    description: "Repeats over items",
    inputs: [MAIN_INPUT],
    outputs: [
      { id: "loop", label: "Loop", type: "main" },
      { id: "done", label: "Done", type: "main" },
    ],
    configSchema: [
      {
        key: "collectionField",
        label: "Collection field",
        type: "upstream-field",
        required: true,
      },
    ],
  },
  approval: {
    kind: "approval",
    label: "Approval",
    description: "Waits for review",
    inputs: [MAIN_INPUT],
    outputs: [
      { id: "approved", label: "Approved", type: "branch" },
      { id: "rejected", label: "Rejected", type: "branch" },
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
  exception: {
    kind: "exception",
    label: "Exception",
    description: "Handles failures",
    inputs: [
      MAIN_INPUT,
      { id: "error-in", label: "Error", type: "error", required: false },
    ],
    outputs: [
      { id: "recovered", label: "Recovered", type: "main" },
      { id: "failed", label: "Failed", type: "error" },
    ],
    configSchema: [
      {
        key: "fallbackAction",
        label: "On error",
        type: "select",
        options: [
          { label: "Retry", value: "retry" },
          { label: "Skip", value: "skip" },
          { label: "Notify", value: "notify" },
        ],
        defaultValue: "retry",
      },
    ],
  },
}

export function getNodeDefinition(kind: NodeKind): NodeDefinition {
  return NODE_DEFINITIONS[kind]
}

export function getDefaultNodeConfig(kind: NodeKind): Record<string, unknown> {
  const definition = getNodeDefinition(kind)
  const config: Record<string, unknown> = {}

  for (const field of definition.configSchema) {
    if (field.defaultValue !== undefined) {
      config[field.key] = field.defaultValue
    }
  }

  return config
}
