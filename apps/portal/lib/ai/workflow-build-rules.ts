import { EMAIL_RECEIVE_OUTPUT_FIELDS } from "@/lib/integrations/registry/email-operations"
import {
  BUILD_ORCHESTRATION,
  DATA_TABLE_GUIDE,
  TRIGGER_BUILD_GUIDE,
  WORKFLOW_GRAPH_SCHEMA,
} from "@/lib/ai/workflow-build-guide"

/** Hints the assistant must follow when wiring catalog components. */
export const COMPONENT_BUILD_HINTS: Record<string, string> = {
  "trigger.workflow":
    "Use a trigger recipe from get_workflow_build_guide.triggerRecipes. Gmail inbox = triggerMode integration + service email + provider gmail + operation receive + authMode secret + secretName (oauth_gmail). Never leave an inbox trigger on manual.",
  "action.edit-fields":
    "Sequential shaper with fieldCount + fieldEdits [{ name, sourceField }]. sourceField is nodeId.fieldName (e.g. trigger-1.from). Single ports: main-out → main-in. Emits one payload containing every mapped field.",
  "action.data-table":
    "Use operation=write, tableName matching list_data_tables exactly, writeMode insert|upsert, columnMappings: [{ columnKey, sourceField }] where columnKey matches table column keys. Create missing tables with create_data_table first.",
  "integrations.external-tool":
    "Outbound integrations only (send email, HTTP). Inbound Gmail/Outlook uses trigger.workflow with triggerMode integration, not this node.",
}

export const WORKFLOW_BUILD_RULES = [
  WORKFLOW_GRAPH_SCHEMA,
  DATA_TABLE_GUIDE,
  TRIGGER_BUILD_GUIDE,
  "Before propose_build_plan or any write tool: call list_component_catalog, list_integration_catalog, list_data_tables, and list_secret_names (or get_workflow_build_guide for the full schema + example).",
  "Use only catalogItemId values from list_component_catalog. Node kind must match the catalog item (actions use kind sequential, not action).",
  "Missing data table: create it with create_data_table (include columns that match your columnMappings) — do not refuse the build. Missing OAuth secret: stop and tell the user to connect Gmail/Outlook in Resources → Secrets.",
  "Edit Fields maps upstream data; Data Table write persists rows. Chain: trigger → edit-fields → data-table with edges on real node ids and main-out → main-in ports.",
  `Gmail receive output fields: ${EMAIL_RECEIVE_OUTPUT_FIELDS.map((f) => f.name).join(", ")}.`,
  BUILD_ORCHESTRATION,
].join("\n")

export const GMAIL_RECEIVE_FIELD_NAMES = EMAIL_RECEIVE_OUTPUT_FIELDS.map(
  (field) => field.name
)
