"use server"

import { revalidatePath } from "next/cache"

import {
  createDataTable,
  deleteDataTable,
  deleteDataTableRow,
  duplicateDataTable,
  insertDataTableRow,
  listDataTableRows,
  saveDataTable,
  updateDataTableRow,
  type SaveDataTableInput,
} from "@/lib/data/data-tables"
import type { DataTable, DataTableRow } from "@/lib/domain/data-table"

export type CreateDataTableResult = { table: DataTable } | { error: string }

export async function createDataTableAction(
  name?: string
): Promise<CreateDataTableResult> {
  try {
    const table = await createDataTable(name)
    revalidatePath("/design/tables")
    return { table }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to create table.",
    }
  }
}

export type SaveDataTableResult = { table: DataTable } | { error: string }

export async function saveDataTableAction(
  input: SaveDataTableInput
): Promise<SaveDataTableResult> {
  try {
    const table = await saveDataTable(input)
    revalidatePath("/design/tables")
    revalidatePath(`/design/tables/${input.id}`)
    revalidatePath("/design/workflow-editor")
    return { table }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to save table.",
    }
  }
}

export type DeleteDataTableResult = { success: true } | { error: string }

export async function deleteDataTableAction(
  tableId: string
): Promise<DeleteDataTableResult> {
  try {
    await deleteDataTable(tableId)
    revalidatePath("/design/tables")
    revalidatePath("/design/workflow-editor")
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete table.",
    }
  }
}

export type DuplicateDataTableResult = { table: DataTable } | { error: string }

export async function duplicateDataTableAction(
  tableId: string
): Promise<DuplicateDataTableResult> {
  try {
    const table = await duplicateDataTable(tableId)
    revalidatePath("/design/tables")
    revalidatePath("/design/workflow-editor")
    return { table }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Failed to duplicate table.",
    }
  }
}

export type ListDataTableRowsResult =
  | { rows: DataTableRow[] }
  | { error: string }

export async function listDataTableRowsAction(
  tableId: string
): Promise<ListDataTableRowsResult> {
  try {
    const rows = await listDataTableRows(tableId)
    return { rows }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to load rows.",
    }
  }
}

export type InsertDataTableRowResult = { row: DataTableRow } | { error: string }

export async function insertDataTableRowAction(
  tableId: string,
  rowData: Record<string, unknown>
): Promise<InsertDataTableRowResult> {
  try {
    const row = await insertDataTableRow(tableId, rowData)
    return { row }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to add row.",
    }
  }
}

export type UpdateDataTableRowResult = { row: DataTableRow } | { error: string }

export async function updateDataTableRowAction(
  rowId: string,
  rowData: Record<string, unknown>
): Promise<UpdateDataTableRowResult> {
  try {
    const row = await updateDataTableRow(rowId, rowData)
    return { row }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to update row.",
    }
  }
}

export type DeleteDataTableRowResult = { success: true } | { error: string }

export async function deleteDataTableRowAction(
  rowId: string,
  tableId: string
): Promise<DeleteDataTableRowResult> {
  try {
    await deleteDataTableRow(rowId)
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Failed to delete row.",
    }
  }
}
