import type {
  DataTable,
  DataTableColumn,
  DataTableRow,
  DataTableSummary,
} from "@/lib/domain/data-table"

export type DataTableRowDb = {
  id: string
  user_id: string
  name: string
  description: string | null
  columns: DataTableColumn[] | null
  updated_at: string
  created_at: string
}

export type DataTableRowRecordDb = {
  id: string
  table_id: string
  user_id: string
  row_data: Record<string, unknown> | null
  updated_at: string
  created_at: string
}

export function mapDataTableRow(
  row: DataTableRowDb,
  rowCount = 0
): DataTable {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    columns: row.columns ?? [],
    rowCount,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }
}

export function mapDataTableSummary(row: DataTableRowDb): DataTableSummary {
  return {
    name: row.name,
    columns: row.columns ?? [],
  }
}

export function mapDataTableRowRecord(row: DataTableRowRecordDb): DataTableRow {
  return {
    id: row.id,
    tableId: row.table_id,
    data: row.row_data ?? {},
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }
}

export function isPersistedDataTableId(id: string) {
  return id !== "new" && id !== "draft"
}
