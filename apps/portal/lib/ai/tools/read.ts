import { tool } from "ai"
import { z } from "zod"

import {
  searchProductKnowledge,
  searchWorkspaceKnowledge,
} from "@/lib/ai/retrieval"
import { COMPONENT_CATALOG } from "@/lib/design/component-catalog"
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
      description: "List the user's data tables.",
      inputSchema: z.object({}),
      execute: async () => {
        const tables = await listDataTables()
        return {
          tables: tables.map((table) => ({
            id: table.id,
            name: table.name,
            description: table.description ?? "",
            columnCount: table.columns.length,
            rowCount: table.rowCount,
          })),
        }
      },
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
        "List valid workflow component catalog ids the AI may use when building graphs.",
      inputSchema: z.object({
        categoryId: z.string().optional(),
      }),
      execute: async ({ categoryId }) => {
        const items = COMPONENT_CATALOG.filter((item) =>
          categoryId ? item.categoryId === categoryId : true
        ).map((item) => ({
          id: item.id,
          kind: item.kind,
          label: item.label,
          description: item.description,
          categoryId: item.categoryId,
        }))
        return { items }
      },
    }),

    list_secret_names: tool({
      description:
        "List secret names (never values) available in Resources → Secrets.",
      inputSchema: z.object({}),
      execute: async () => {
        const secrets = await listSecretSummaries()
        return {
          secrets: secrets.map((secret) => ({
            name: secret.name,
            kind: secret.kind,
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
