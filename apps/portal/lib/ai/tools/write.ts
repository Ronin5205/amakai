import { tool } from "ai"
import { z } from "zod"

import { validateAiWorkflowGraph } from "@/lib/ai/graph-validation"
import { createConfirmationRequest, consumeConfirmation } from "@/lib/ai/tools/confirmation"
import type { AiToolContext } from "@/lib/ai/tools/types"
import {
  createWorkflowDraft,
  deleteWorkflow,
  getWorkflowDraft,
  saveWorkflowDraft,
} from "@/lib/data/workflows"
import {
  createDataTable,
  deleteDataTable,
  getDataTable,
  saveDataTable,
} from "@/lib/data/data-tables"
import { deployWorkflowDraft } from "@/lib/data/deployments"
import type { DataTableColumn } from "@/lib/domain/data-table"

const columnSchema = z.object({
  key: z.string().min(1).max(64),
  label: z.string().min(1).max(80),
  type: z.enum(["string", "number", "boolean", "json"]),
})

export function createWriteTools(ctx: AiToolContext) {
  return {
    create_data_table: tool({
      description:
        "Create a data table with the given columns (additive). Prefer ask_clarification + propose_build_plan first.",
      inputSchema: z.object({
        name: z.string().min(1).max(80),
        description: z.string().max(400).optional(),
        columns: z.array(columnSchema).min(1).max(40),
      }),
      execute: async ({ name, description, columns }) => {
        const table = await createDataTable(name, description)
        const saved = await saveDataTable({
          id: table.id,
          name: table.name,
          description: description ?? table.description,
          columns: columns as DataTableColumn[],
        })
        return {
          ok: true,
          table: {
            id: saved.id,
            name: saved.name,
            columns: saved.columns,
          },
        }
      },
    }),

    add_data_table_columns: tool({
      description: "Add columns to an existing data table (additive).",
      inputSchema: z.object({
        tableId: z.string().uuid(),
        columns: z.array(columnSchema).min(1).max(20),
      }),
      execute: async ({ tableId, columns }) => {
        const table = await getDataTable(tableId)
        if (!table) {
          return { error: "Table not found." }
        }

        const existingKeys = new Set(table.columns.map((column) => column.key))
        const merged = [...table.columns]
        for (const column of columns) {
          if (existingKeys.has(column.key)) {
            return { error: `Column key "${column.key}" already exists.` }
          }
          merged.push(column)
          existingKeys.add(column.key)
        }

        const saved = await saveDataTable({
          id: table.id,
          name: table.name,
          description: table.description,
          columns: merged,
        })

        return {
          ok: true,
          table: { id: saved.id, name: saved.name, columns: saved.columns },
        }
      },
    }),

    create_workflow: tool({
      description:
        "Create an empty workflow draft. Prefer ask_clarification + propose_build_plan first.",
      inputSchema: z.object({
        name: z.string().min(1).max(80),
      }),
      execute: async ({ name }) => {
        const workflow = await createWorkflowDraft(name)
        return {
          ok: true,
          workflow: {
            id: workflow.id,
            name: workflow.name,
            status: workflow.status ?? "draft",
          },
        }
      },
    }),

    apply_workflow_graph: tool({
      description:
        "Apply a validated workflow graph. On the editor canvas this returns a live patch; otherwise it saves the draft.",
      inputSchema: z.object({
        workflowId: z.string().uuid(),
        graph: z.object({
          nodes: z.array(z.record(z.string(), z.unknown())).min(1),
          edges: z.array(z.record(z.string(), z.unknown())).default([]),
        }),
      }),
      execute: async ({ workflowId, graph }) => {
        const validated = validateAiWorkflowGraph(graph)
        if (!validated.ok) {
          return {
            ok: false,
            error: validated.error,
            issues: validated.issues,
          }
        }

        if (ctx.editor?.liveCanvas && ctx.editor.workflowId === workflowId) {
          return {
            ok: true,
            livePatch: {
              kind: "live_graph_patch" as const,
              workflowId,
              graph: validated.graph,
            },
          }
        }

        const existing = await getWorkflowDraft(workflowId)
        const saved = await saveWorkflowDraft({
          ...existing,
          id: workflowId,
          nodes: validated.graph.nodes,
          edges: validated.graph.edges,
          updatedAt: new Date().toISOString(),
        })

        return {
          ok: true,
          workflow: {
            id: saved.id,
            name: saved.name,
            nodeCount: saved.nodes.length,
            edgeCount: (saved.edges ?? []).length,
          },
        }
      },
    }),

    delete_workflow: tool({
      description:
        "Delete a workflow. Always requires user confirmation via confirmationToken.",
      inputSchema: z.object({
        workflowId: z.string().uuid(),
        confirmationToken: z.string().optional(),
      }),
      execute: async ({ workflowId, confirmationToken }) => {
        const token = confirmationToken ?? ctx.confirmationToken
        if (!token) {
          const workflow = await getWorkflowDraft(workflowId)
          return createConfirmationRequest({
            userId: ctx.userId,
            toolName: "delete_workflow",
            summary: `Delete workflow "${workflow.name}" (${workflowId}).`,
            payload: { workflowId },
          })
        }

        const payload = consumeConfirmation({
          userId: ctx.userId,
          confirmationId: token,
          toolName: "delete_workflow",
        })
        if (!payload || payload.workflowId !== workflowId) {
          return { error: "Invalid or expired confirmation token." }
        }

        await deleteWorkflow(workflowId)
        return { ok: true, deletedWorkflowId: workflowId }
      },
    }),

    delete_data_table: tool({
      description:
        "Delete a data table. Always requires user confirmation via confirmationToken.",
      inputSchema: z.object({
        tableId: z.string().uuid(),
        confirmationToken: z.string().optional(),
      }),
      execute: async ({ tableId, confirmationToken }) => {
        const token = confirmationToken ?? ctx.confirmationToken
        if (!token) {
          const table = await getDataTable(tableId)
          return createConfirmationRequest({
            userId: ctx.userId,
            toolName: "delete_data_table",
            summary: `Delete data table "${table?.name ?? tableId}" (${tableId}).`,
            payload: { tableId },
          })
        }

        const payload = consumeConfirmation({
          userId: ctx.userId,
          confirmationId: token,
          toolName: "delete_data_table",
        })
        if (!payload || payload.tableId !== tableId) {
          return { error: "Invalid or expired confirmation token." }
        }

        await deleteDataTable(tableId)
        return { ok: true, deletedTableId: tableId }
      },
    }),

    remove_data_table_columns: tool({
      description:
        "Remove columns from a data table. Always requires confirmation.",
      inputSchema: z.object({
        tableId: z.string().uuid(),
        columnKeys: z.array(z.string().min(1)).min(1).max(20),
        confirmationToken: z.string().optional(),
      }),
      execute: async ({ tableId, columnKeys, confirmationToken }) => {
        const token = confirmationToken ?? ctx.confirmationToken
        if (!token) {
          const table = await getDataTable(tableId)
          return createConfirmationRequest({
            userId: ctx.userId,
            toolName: "remove_data_table_columns",
            summary: `Remove columns [${columnKeys.join(", ")}] from table "${table?.name ?? tableId}".`,
            payload: { tableId, columnKeys },
          })
        }

        const payload = consumeConfirmation({
          userId: ctx.userId,
          confirmationId: token,
          toolName: "remove_data_table_columns",
        })
        if (!payload || payload.tableId !== tableId) {
          return { error: "Invalid or expired confirmation token." }
        }

        const table = await getDataTable(tableId)
        if (!table) {
          return { error: "Table not found." }
        }

        const remove = new Set(columnKeys)
        const columns = table.columns.filter((column) => !remove.has(column.key))
        if (columns.length === 0) {
          return { error: "Cannot remove all columns from a table." }
        }

        const saved = await saveDataTable({
          id: table.id,
          name: table.name,
          description: table.description,
          columns,
        })

        return {
          ok: true,
          table: { id: saved.id, name: saved.name, columns: saved.columns },
        }
      },
    }),

    deploy_workflow: tool({
      description:
        "Deploy a workflow draft to production. Always requires confirmation.",
      inputSchema: z.object({
        workflowId: z.string().uuid(),
        confirmationToken: z.string().optional(),
      }),
      execute: async ({ workflowId, confirmationToken }) => {
        const token = confirmationToken ?? ctx.confirmationToken
        if (!token) {
          const workflow = await getWorkflowDraft(workflowId)
          return createConfirmationRequest({
            userId: ctx.userId,
            toolName: "deploy_workflow",
            summary: `Deploy workflow "${workflow.name}" to production.`,
            payload: { workflowId },
          })
        }

        const payload = consumeConfirmation({
          userId: ctx.userId,
          confirmationId: token,
          toolName: "deploy_workflow",
        })
        if (!payload || payload.workflowId !== workflowId) {
          return { error: "Invalid or expired confirmation token." }
        }

        const result = await deployWorkflowDraft(workflowId)
        return { ok: true, deployment: result }
      },
    }),
  }
}
