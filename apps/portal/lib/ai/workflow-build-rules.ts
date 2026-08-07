import { EMAIL_RECEIVE_OUTPUT_FIELDS } from "@/lib/integrations/registry/email-operations"
import {
  BUILD_ORCHESTRATION,
  DATA_TABLE_GUIDE,
  WORKFLOW_GRAPH_SCHEMA,
} from "@/lib/ai/workflow-build-guide"

/** Hints the assistant must follow when wiring catalog components. */
export const COMPONENT_BUILD_HINTS: Record<string, string> = {
  "trigger.workflow":
    "Use triggerMode integration (not manual) for Gmail/Outlook inbox triggers. Config: service=email, provider=gmail|outlook, operation=receive, authMode=secret, secretName from list_secret_names (oauth_gmail/oauth_outlook). A label like 'Gmail trigger' is NOT enough — mode must be integration.",
  "action.edit-fields":
    "Extract/shape fields with fieldCount and fieldEdits rows [{ name, sourceField }]. sourceField must be nodeId.fieldName (e.g. trigger-1.from). Connect trigger main-out → edit-fields main-in.",
  "action.data-table":
    "Use operation=write, tableName matching list_data_tables exactly, writeMode insert|upsert, columnMappings: [{ columnKey, sourceField }] where columnKey matches table column keys. Create missing tables with create_data_table first.",
  "integrations.external-tool":
    "Outbound integrations only (send email, HTTP). Inbound Gmail/Outlook uses trigger.workflow with triggerMode integration, not this node.",
}

export const WORKFLOW_BUILD_RULES = [
  WORKFLOW_GRAPH_SCHEMA,
  DATA_TABLE_GUIDE,
  "Before propose_build_plan or any write tool: call list_component_catalog, list_integration_catalog, list_data_tables, and list_secret_names (or get_workflow_build_guide for the full schema + example).",
  "Use only catalogItemId values from list_component_catalog. Node kind must match the catalog item (actions use kind sequential, not action).",
  "Gmail inbox trigger: trigger.workflow + triggerMode integration + service email + provider gmail + operation receive + authMode secret + secretName from list_secret_names.",
  "Missing data table: create it with create_data_table (include columns that match your columnMappings) — do not refuse the build. Missing OAuth secret: stop and tell the user to connect Gmail/Outlook in Resources → Secrets.",
  "Edit Fields maps upstream data; Data Table write persists rows. Chain: trigger → edit-fields → data-table with edges on real node ids and main-out → main-in ports.",
  `Gmail receive output fields: ${EMAIL_RECEIVE_OUTPUT_FIELDS.map((f) => f.name).join(", ")}.`,
  BUILD_ORCHESTRATION,
].join("\n")

export const GMAIL_RECEIVE_FIELD_NAMES = EMAIL_RECEIVE_OUTPUT_FIELDS.map(
  (field) => field.name
)
