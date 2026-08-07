import { tool } from "ai"
import { z } from "zod"

import {
  searchProductKnowledge,
  searchWorkspaceKnowledge,
} from "@/lib/ai/retrieval"
import { COMPONENT_CATALOG } from "@/lib/design/component-catalog"
import { INTEGRATION_SERVICES } from "@/lib/integrations/registry"
import {
  COMPONENT_BUILD_HINTS,
  WORKFLOW_BUILD_RULES,
} from "@/lib/ai/workflow-build-rules"
import { getWorkflowBuildGuide } from "@/lib/ai/workflow-build-guide"
import { COMPONENT_VARIANT_SPECS } from "@/lib/design/component-variant-definitions"
import { listWorkflows, getWorkflowDraft } from "@/lib/data/workflows"
import {
  listDataTables,
  getDataTable,
} from "@/lib/data/data-tables"
import { listSecretSummaries } from "@/lib/data/secrets"
import { listExecutions } from "@/lib/data/executions"
import type { AiToolContext } from "@/lib/ai/tools/types"

export function createReadTools(ctx: AiToolContext) {
  return {
    search_product_knowledge: tool({
      description:
        "Search Amakai product docs and the component catalog. Use before answering product questions.",
      inputSchema: z.object({
        query: z.string().min(1).max(500),
        matchCount: z.number().int().min(1).max(12).optional(),
      }),
      execute: async ({ query, matchCount }) => {
        const hits = await searchProductKnowledge(query, {
          matchCount,
          userId: ctx.userId,
        })
        return { hits }
      },
    }),

    search_workspace: tool({
      description:
        "Search the user's workflows and data-table schemas via semantic retrieval.",
      inputSchema: z.object({
        query: z.string().min(1).max(500),
        matchCount: z.number().int().min(1).max(12).optional(),
      }),
      execute: async ({ query, matchCount }) => {
        const hits = await searchWorkspaceKnowledge(query, {
          matchCount,
          userId: ctx.userId,
        })
        return { hits }
      },
    }),

    list_workflows: tool({
      description: "List the user's workflows (id, name, status, node count).",
      inputSchema: z.object({}),
      execute: async () => {
        const workflows = await listWorkflows()
        return {
          workflows: workflows.map((workflow) => ({
            id: workflow.id,
            name: workflow.name,
            status: workflow.status ?? "draft",
            nodeCount: workflow.nodes.length,
            updatedAt: workflow.updatedAt,
          })),
        }
      },
    }),

    get_workflow: tool({
      description: "Load a workflow draft graph by id.",
      inputSchema: z.object({
        workflowId: z.string().uuid(),
      }),
      execute: async ({ workflowId }) => {
        const workflow = await getWorkflowDraft(workflowId)
        return {
          id: workflow.id,
          name: workflow.name,
          status: workflow.status ?? "draft",
          nodes: workflow.nodes,
          edges: workflow.edges ?? [],
          hasUnpublishedChanges: workflow.hasUnpublishedChanges ?? false,
        }
      },
    }),

    list_data_tables: tool({
      description:
        "List the user's data tables with column keys (needed for action.data-table columnMappings).",
      inputSchema: z.object({}),
      execute: async () => {
        const tables = await listDataTables()
        return {
          tables: tables.map((table) => ({
            id: table.id,
            name: table.name,
            description: table.description ?? "",
            columns: table.columns.map((column) => ({
              key: column.key,
              label: column.label,
              type: column.type,
            })),
            rowCount: table.rowCount,
          })),
        }
      },
    }),

    get_workflow_build_guide: tool({
      description:
        "Return the workflow graph schema, data-table column rules, build orchestration steps, and a complete Gmail→table example. Call before apply_workflow_graph when building automations.",
      inputSchema: z.object({}),
      execute: async () => getWorkflowBuildGuide(),
    }),

    get_data_table_schema: tool({
      description: "Get a data table schema by id.",
      inputSchema: z.object({
        tableId: z.string().uuid(),
      }),
      execute: async ({ tableId }) => {
        const table = await getDataTable(tableId)
        if (!table) {
          return { error: "Table not found." }
        }
        return {
          id: table.id,
          name: table.name,
          description: table.description ?? "",
          columns: table.columns,
          rowCount: table.rowCount,
        }
      },
    }),

    list_component_catalog: tool({
      description:
        "List valid workflow component catalog ids and build wiring hints. Required before building workflows.",
      inputSchema: z.object({
        categoryId: z.string().optional(),
      }),
      execute: async ({ categoryId }) => {
        const items = COMPONENT_CATALOG.filter((item) =>
          categoryId ? item.categoryId === categoryId : true
        ).map((item) => {
          const spec = COMPONENT_VARIANT_SPECS[item.id]
          return {
            id: item.id,
            kind: item.kind,
            label: item.label,
            description: item.description,
            categoryId: item.categoryId,
            defaultConfig: item.defaultConfig ?? null,
            buildHint: COMPONENT_BUILD_HINTS[item.id] ?? null,
            inputs: spec?.inputs.map((port) => port.id) ?? [],
            outputs: spec?.outputs.map((port) => port.id) ?? [],
          }
        })
        return { items, rules: WORKFLOW_BUILD_RULES }
      },
    }),

    list_integration_catalog: tool({
      description:
        "List external integration services (Gmail receive, send, HTTP, webhook) with required secret kinds and trigger/action wiring.",
      inputSchema: z.object({}),
      execute: async () => {
        return {
          services: INTEGRATION_SERVICES.map((service) => ({
            id: service.id,
            label: service.label,
            description: service.description,
            providers: service.providers.map((provider) => ({
              id: provider.id,
              label: provider.label,
              secretKinds: provider.secretKinds,
              operations: provider.operations.map((operation) => ({
                id: operation.id,
                label: operation.label,
                nodeKind: operation.nodeKind,
                description: operation.description,
                defaultOutputFields: operation.defaultOutputFields ?? null,
              })),
            })),
          })),
          triggerWiring:
            "Inbound email (Gmail/Outlook) uses trigger.workflow with triggerMode=integration, not integrations.external-tool.",
        }
      },
    }),

    check_workflow_prerequisites: tool({
      description:
        "Check secrets and tables before building. Missing tables can be created with create_data_table. Only missing OAuth secrets block the build.",
      inputSchema: z.object({
        requiresGmailInbox: z.boolean().optional(),
        requiresOutlookInbox: z.boolean().optional(),
        tableName: z.string().optional(),
        suggestedTableColumns: z
          .array(
            z.object({
              key: z.string().min(1).max(64),
              label: z.string().min(1).max(80),
              type: z.enum(["string", "number", "boolean", "json"]),
            })
          )
          .optional(),
      }),
      execute: async ({
        requiresGmailInbox,
        requiresOutlookInbox,
        tableName,
        suggestedTableColumns,
      }) => {
        const blockers: string[] = []
        const suggestedActions: Array<Record<string, unknown>> = []
        const secrets = await listSecretSummaries()
        const tables = await listDataTables()

        if (requiresGmailInbox) {
          const gmailSecrets = secrets.filter((secret) => secret.kind === "oauth_gmail")
          if (gmailSecrets.length === 0) {
            blockers.push(
              "No Gmail OAuth secret. The user must connect Gmail in Resources → Secrets before an inbox trigger can run."
            )
            suggestedActions.push({
              action: "user_connect_secret",
              kind: "oauth_gmail",
              path: "Resources → Secrets",
            })
          }
        }

        if (requiresOutlookInbox) {
          const outlookSecrets = secrets.filter(
            (secret) => secret.kind === "oauth_outlook"
          )
          if (outlookSecrets.length === 0) {
            blockers.push(
              "No Outlook OAuth secret. The user must connect Outlook in Resources → Secrets before an inbox trigger can run."
            )
            suggestedActions.push({
              action: "user_connect_secret",
              kind: "oauth_outlook",
              path: "Resources → Secrets",
            })
          }
        }

        if (tableName?.trim()) {
          const match = tables.find(
            (table) =>
              table.name.trim().toLowerCase() === tableName.trim().toLowerCase()
          )
          if (!match) {
            suggestedActions.push({
              action: "create_data_table",
              name: tableName.trim(),
              columns: suggestedTableColumns ?? [
                { key: "from", label: "From", type: "string" },
                { key: "subject", label: "Subject", type: "string" },
                { key: "body", label: "Body", type: "string" },
              ],
            })
          }
        }

        return {
          ok: blockers.length === 0,
          blockers,
          suggestedActions,
          canCreateTables: true,
          canCreateWorkflows: true,
          secrets: secrets.map((secret) => ({
            name: secret.name,
            kind: secret.kind,
            accountEmail: secret.accountEmail ?? null,
          })),
          tables: tables.map((table) => ({
            id: table.id,
            name: table.name,
            columns: table.columns.map((column) => ({
              key: column.key,
              label: column.label,
              type: column.type,
            })),
          })),
        }
      },
    }),

    list_secret_names: tool({
      description:
        "List secret names (never values). Required before Gmail/Outlook triggers or any integration using authMode secret.",
      inputSchema: z.object({
        kind: z
          .enum([
            "oauth_gmail",
            "oauth_outlook",
            "api_key",
            "smtp",
            "webhook_signing",
            "bearer_token",
          ])
          .optional(),
      }),
      execute: async ({ kind }) => {
        const secrets = await listSecretSummaries(kind ? [kind] : undefined)
        return {
          secrets: secrets.map((secret) => ({
            name: secret.name,
            kind: secret.kind,
            accountEmail: secret.accountEmail ?? null,
          })),
        }
      },
    }),

    get_recent_executions: tool({
      description: "List recent production workflow executions.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(20).optional(),
      }),
      execute: async ({ limit }) => {
        const executions = await listExecutions()
        return {
          executions: executions.slice(0, limit ?? 10).map((execution) => ({
            id: execution.id,
            workflowName: execution.workflowName,
            status: execution.status,
            startedAt: execution.startedAt,
            durationMs: execution.durationMs,
            trigger: execution.trigger,
          })),
        }
      },
    }),
  }
}
