import "server-only"

import { deployWorkflowDraft } from "@/lib/data/deployments"
import {
  deleteWorkflow,
  getWorkflowDraft,
} from "@/lib/data/workflows"
import {
  deleteDataTable,
  getDataTable,
  saveDataTable,
} from "@/lib/data/data-tables"
import { consumeConfirmation, peekConfirmation } from "@/lib/ai/tools/confirmation"

export type ConfirmedActionResult =
  | {
      ok: true
      toolName: string
      summary: string
      result: Record<string, unknown>
    }
  | { ok: false; error: string }

export function isConfirmationUserMessage(text: string): boolean {
  return /\bconfirm\b/i.test(text) || /pending confirmation token/i.test(text)
}

export async function executeConfirmedDestructiveAction(input: {
  userId: string
  confirmationToken: string
}): Promise<ConfirmedActionResult> {
  const pending = peekConfirmation(input.confirmationToken)
  if (!pending || pending.userId !== input.userId) {
    return { ok: false, error: "Invalid or expired confirmation token." }
  }

  const payload = consumeConfirmation({
    userId: input.userId,
    confirmationId: input.confirmationToken,
    toolName: pending.toolName,
  })
  if (!payload) {
    return { ok: false, error: "Invalid or expired confirmation token." }
  }

  switch (pending.toolName) {
    case "deploy_workflow": {
      const workflowId = String(payload.workflowId ?? "")
      if (!workflowId) {
        return { ok: false, error: "Missing workflow id in confirmation." }
      }
      const workflow = await getWorkflowDraft(workflowId)
      const deployment = await deployWorkflowDraft(workflowId)
      return {
        ok: true,
        toolName: pending.toolName,
        summary: `Deployed workflow "${workflow.name}" to production.`,
        result: { workflowId, deployment, workflowName: workflow.name },
      }
    }

    case "delete_workflow": {
      const workflowId = String(payload.workflowId ?? "")
      if (!workflowId) {
        return { ok: false, error: "Missing workflow id in confirmation." }
      }
      const workflow = await getWorkflowDraft(workflowId)
      await deleteWorkflow(workflowId)
      return {
        ok: true,
        toolName: pending.toolName,
        summary: `Deleted workflow "${workflow.name}".`,
        result: { workflowId, workflowName: workflow.name },
      }
    }

    case "delete_data_table": {
      const tableId = String(payload.tableId ?? "")
      if (!tableId) {
        return { ok: false, error: "Missing table id in confirmation." }
      }
      const table = await getDataTable(tableId)
      await deleteDataTable(tableId)
      return {
        ok: true,
        toolName: pending.toolName,
        summary: `Deleted data table "${table?.name ?? tableId}".`,
        result: { tableId, tableName: table?.name ?? tableId },
      }
    }

    case "remove_data_table_columns": {
      const tableId = String(payload.tableId ?? "")
      const columnKeys = Array.isArray(payload.columnKeys)
        ? payload.columnKeys.map(String)
        : []
      if (!tableId || columnKeys.length === 0) {
        return { ok: false, error: "Missing table or column keys in confirmation." }
      }

      const table = await getDataTable(tableId)
      if (!table) {
        return { ok: false, error: "Table not found." }
      }

      const remove = new Set(columnKeys)
      const columns = table.columns.filter((column) => !remove.has(column.key))
      if (columns.length === 0) {
        return { ok: false, error: "Cannot remove all columns from a table." }
      }

      const saved = await saveDataTable({
        id: table.id,
        name: table.name,
        description: table.description,
        columns,
      })

      return {
        ok: true,
        toolName: pending.toolName,
        summary: `Removed columns [${columnKeys.join(", ")}] from "${saved.name}".`,
        result: { tableId: saved.id, tableName: saved.name, columnKeys },
      }
    }

    default:
      return { ok: false, error: `Unsupported confirmed action: ${pending.toolName}.` }
  }
}
