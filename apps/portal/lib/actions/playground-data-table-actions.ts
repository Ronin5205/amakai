"use server"

import {
  getDataTableByName,
  insertDataTableRow,
  listDataTableRows,
  updateDataTableRow,
} from "@/lib/data/data-tables"
import type { DataTableRow } from "@/lib/domain/data-table"
import { findDataTableRowByColumnValue } from "@/lib/engine/playground-data-table"

export type PlaygroundDataTableReadResult =
  | { rows: DataTableRow[]; tableName: string }
  | { error: string }

export async function playgroundDataTableReadAction(
  tableName: string
): Promise<PlaygroundDataTableReadResult> {
  try {
    const table = await getDataTableByName(tableName)
    if (!table) {
      return { error: `Table "${tableName}" was not found.` }
    }

    const rows = await listDataTableRows(table.id)
    return { rows, tableName: table.name }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : `Failed to read table "${tableName}".`,
    }
  }
}

export type PlaygroundDataTableWriteResult =
  | { row: DataTableRow; tableName: string; updated?: boolean }
  | { error: string }

export async function playgroundDataTableWriteAction(
  tableName: string,
  rowData: Record<string, unknown>,
  options?: {
    writeMode?: "insert" | "upsert"
    matchColumn?: string
    matchValue?: unknown
  }
): Promise<PlaygroundDataTableWriteResult> {
  try {
    const table = await getDataTableByName(tableName)
    if (!table) {
      return { error: `Table "${tableName}" was not found.` }
    }

    const writeMode = options?.writeMode ?? "insert"
    const matchColumn = options?.matchColumn?.trim() ?? ""

    if (writeMode === "upsert" && matchColumn && options?.matchValue !== undefined) {
      const rows = await listDataTableRows(table.id)
      const existing = findDataTableRowByColumnValue(
        rows,
        matchColumn,
        options.matchValue
      )

      if (existing) {
        const merged = { ...existing.data, ...rowData }
        const row = await updateDataTableRow(existing.id, merged)
        return { row, tableName: table.name, updated: true }
      }
    }

    const row = await insertDataTableRow(table.id, rowData)
    return { row, tableName: table.name, updated: false }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : `Failed to write to table "${tableName}".`,
    }
  }
}
