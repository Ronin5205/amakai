import { EMAIL_RECEIVE_OUTPUT_FIELDS } from "@/lib/integrations/registry/email-operations"

/** Graph shape the assistant must produce for apply_workflow_graph. */
export const WORKFLOW_GRAPH_SCHEMA = `
Workflow graph JSON:
{
  "nodes": [ { "id", "label", "kind", "config": { "catalogItemId", ... } } ],
  "edges": [ { "id", "source", "target", "sourcePort?", "targetPort?" } ]
}

Node kinds (never use "action" — use "sequential" for action components):
  trigger | sequential | parallel | conditional | loop | approval | exception

Every node needs:
  - id: stable slug, e.g. trigger-1, edit-1, table-1
  - label: human-readable name
  - kind: must match the catalog item's kind
  - config.catalogItemId: from list_component_catalog only

Edges connect node ids. Standard ports:
  - Most nodes: sourcePort "main-out" → targetPort "main-in"
  - Edit Fields: use main-out/main-in for the first mapping pair
  - Triggers have no inputs; only main-out

Upstream field references use "nodeId.fieldName" (e.g. trigger-1.subject).
`.trim()

export const DATA_TABLE_GUIDE = `
Data table columns: { key, label, type } where type is string | number | boolean | json.
  - key: snake_case identifier used in columnMappings (e.g. email_from, subject_line)
  - label: display name
Create tables with create_data_table before wiring action.data-table write nodes.
Table name in config.tableName must match list_data_tables exactly (case-insensitive).
`.trim()

export const BUILD_ORCHESTRATION = `
Build orchestration (you have full read/write access to workflows and tables):
1. list_component_catalog + list_integration_catalog + list_data_tables + list_secret_names
2. check_workflow_prerequisites — only OAuth secrets block automation (user must connect in Resources → Secrets)
3. ask_clarification if intent is unclear; propose_build_plan and wait for approval
4. create_data_table when a required table is missing (you can create it — do not refuse)
5. create_workflow when starting a new automation (or use the open editor workflow id)
6. apply_workflow_graph with a complete validated graph
7. deploy_workflow only when the user asks to go live (requires confirmation)

If apply_workflow_graph fails, read issues[], fix the graph, and retry.
`.trim()

/** Canonical example: Gmail inbox → shape fields → persist to data table. */
export const GMAIL_INBOX_TO_TABLE_EXAMPLE = {
  description:
    "Save incoming Gmail messages to a data table. Replace secretName with a value from list_secret_names.",
  nodes: [
    {
      id: "trigger-1",
      label: "Gmail inbox",
      kind: "trigger",
      config: {
        catalogItemId: "trigger.workflow",
        triggerMode: "integration",
        service: "email",
        provider: "gmail",
        operation: "receive",
        authMode: "secret",
        secretName: "My Gmail",
      },
    },
    {
      id: "edit-1",
      label: "Map email fields",
      kind: "sequential",
      config: {
        catalogItemId: "action.edit-fields",
        fieldCount: 4,
        fieldEdits: [
          { name: "from", sourceField: "trigger-1.from" },
          { name: "subject", sourceField: "trigger-1.subject" },
          { name: "body", sourceField: "trigger-1.body" },
          { name: "receivedAt", sourceField: "trigger-1.receivedAt" },
        ],
      },
    },
    {
      id: "table-1",
      label: "Save to inbox",
      kind: "sequential",
      config: {
        catalogItemId: "action.data-table",
        operation: "write",
        tableName: "Inbox Messages",
        writeMode: "insert",
        columnMappings: [
          { columnKey: "from", sourceField: "edit-1.from" },
          { columnKey: "subject", sourceField: "edit-1.subject" },
          { columnKey: "body", sourceField: "edit-1.body" },
          { columnKey: "received_at", sourceField: "edit-1.receivedAt" },
        ],
      },
    },
  ],
  edges: [
    {
      id: "e1",
      source: "trigger-1",
      target: "edit-1",
      sourcePort: "main-out",
      targetPort: "main-in",
    },
    {
      id: "e2",
      source: "edit-1",
      target: "table-1",
      sourcePort: "main-out",
      targetPort: "main-in",
    },
  ],
  suggestedTableColumns: [
    { key: "from", label: "From", type: "string" as const },
    { key: "subject", label: "Subject", type: "string" as const },
    { key: "body", label: "Body", type: "string" as const },
    { key: "received_at", label: "Received at", type: "string" as const },
  ],
}

export function getWorkflowBuildGuide() {
  return {
    graphSchema: WORKFLOW_GRAPH_SCHEMA,
    dataTableGuide: DATA_TABLE_GUIDE,
    orchestration: BUILD_ORCHESTRATION,
    gmailReceiveOutputFields: EMAIL_RECEIVE_OUTPUT_FIELDS.map((field) => field.name),
    example: GMAIL_INBOX_TO_TABLE_EXAMPLE,
    privileges: {
      canCreateWorkflows: true,
      canCreateDataTables: true,
      canModifyGraphs: true,
      canDeploy: true,
      cannotCreateSecrets:
        "OAuth/API secrets must be connected by the user in Resources → Secrets. Use list_secret_names and set config.secretName.",
    },
  }
}
