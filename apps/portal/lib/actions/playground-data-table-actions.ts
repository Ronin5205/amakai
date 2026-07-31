"use server"

import {
  getDataTableByName,
  insertDataTableRow,
  listDataTableRows,
} from "@/lib/data/data-tables"
import type { DataTableRow } from "@/lib/domain/data-table"

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
  | { row: DataTableRow; tableName: string }
  | { error: string }

export async function playgroundDataTableWriteAction(
  tableName: string,
  rowData: Record<string, unknown>
): Promise<PlaygroundDataTableWriteResult> {
  try {
    const table = await getDataTableByName(tableName)
    if (!table) {
      return { error: `Table "${tableName}" was not found.` }
    }

    const row = await insertDataTableRow(table.id, rowData)
    return { row, tableName: table.name }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : `Failed to write to table "${tableName}".`,
    }
  }
}
