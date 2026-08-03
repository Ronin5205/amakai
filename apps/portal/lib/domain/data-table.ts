export type DataTableColumnType = "string" | "number" | "boolean" | "json"

export type DataTableColumn = {
  key: string
  label: string
  type: DataTableColumnType
}

export type DataTable = {
  id: string
  name: string
  description?: string
  columns: DataTableColumn[]
  rowCount: number
  updatedAt: string
  createdAt: string
}

/** Lightweight shape passed to the workflow editor for table selection. */
export type DataTableSummary = Pick<DataTable, "name" | "columns">

export type DataTableRow = {
  id: string
  tableId: string
  data: Record<string, unknown>
  updatedAt: string
  createdAt: string
}

/** Maps a table column to an upstream workflow field when writing rows. */
export type TableColumnMapRow = {
  columnKey: string
  sourceField: string
}

export function buildDefaultColumnMappings(
  columns: DataTableColumn[],
  existing: TableColumnMapRow[] = []
): TableColumnMapRow[] {
  return columns.map((column) => {
    const previous = existing.find((row) => row.columnKey === column.key)
    return {
      columnKey: column.key,
      sourceField: previous?.sourceField ?? "",
    }
  })
}

export function findDataTableSummary(
  tables: DataTableSummary[],
  tableName: string
) {
  const normalized = tableName.trim().toLowerCase()
  return tables.find((table) => table.name.trim().toLowerCase() === normalized)
}

export function createDefaultColumn(index = 1): DataTableColumn {
  const key = `field_${index}`
  return {
    key,
    label: `Field ${index}`,
    type: "string",
  }
}

export function createEmptyDataTableDraft(name = "Untitled table"): Omit<
  DataTable,
  "id" | "rowCount" | "updatedAt" | "createdAt"
> {
  return {
    name,
    description: "",
    columns: [createDefaultColumn()],
  }
}
