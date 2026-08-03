import type { DataTable, DataTableRow } from "@/lib/domain/data-table"
import {
  assertDataTableLimitNotReached,
  buildDataTableLimitState,
  countUserDataTables,
  type DataTableLimitState,
} from "@/lib/data/table-limits"
import {
  isPersistedDataTableId,
  mapDataTableRow,
  mapDataTableRowRecord,
  mapDataTableSummary,
  type DataTableRowDb,
  type DataTableRowRecordDb,
} from "@/lib/data/data-table-mappers"
import { validateSaveDataTableInput } from "@/lib/validation/data-table-schema"
import {
  normalizeValidatedResourceName,
  parseOptionalDescription,
  parseResourceName,
} from "@/lib/validation/resource-names"
import { createClient } from "@/utils/supabase/server"

async function getAuthenticatedUserId() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return { supabase, userId: user.id }
}

function normalizeTableName(name: string) {
  return normalizeValidatedResourceName(name, "Untitled table")
}

async function assertUniqueTableName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  name: string,
  excludeTableId?: string
) {
  const normalizedName = normalizeTableName(name)

  let query = supabase
    .from("data_tables")
    .select("id, name")
    .eq("user_id", userId)

  if (excludeTableId) {
    query = query.neq("id", excludeTableId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(error.message ?? "Failed to validate table name.")
  }

  const duplicate = (data ?? []).find(
    (row) => row.name.trim().toLowerCase() === normalizedName.toLowerCase()
  )

  if (duplicate) {
    throw new Error(`A table named "${duplicate.name}" already exists.`)
  }
}

async function generateUniqueTableName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  baseName: string
) {
  const root = normalizeTableName(baseName)
  const { data, error } = await supabase
    .from("data_tables")
    .select("name")
    .eq("user_id", userId)

  if (error) {
    return root
  }

  const existing = new Set(
    (data ?? []).map((row) => row.name.trim().toLowerCase())
  )

  if (!existing.has(root.toLowerCase())) {
    return root
  }

  let index = 2
  while (existing.has(`${root} ${index}`.toLowerCase())) {
    index += 1
  }

  return `${root} ${index}`
}

async function countRowsForTable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tableId: string
) {
  const { count, error } = await supabase
    .from("data_table_rows")
    .select("*", { count: "exact", head: true })
    .eq("table_id", tableId)
    .eq("user_id", userId)

  if (error) {
    return 0
  }

  return count ?? 0
}

export async function listDataTables(): Promise<DataTable[]> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return []
  }

  const { data, error } = await auth.supabase
    .from("data_tables")
    .select("*")
    .eq("user_id", auth.userId)
    .order("updated_at", { ascending: false })

  if (error || !data) {
    return []
  }

  const tables = await Promise.all(
    (data as DataTableRowDb[]).map(async (row) => {
      const rowCount = await countRowsForTable(auth.supabase, auth.userId, row.id)
      return mapDataTableRow(row, rowCount)
    })
  )

  return tables
}

export async function getDataTableLimitState(): Promise<DataTableLimitState | null> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return null
  }

  const count = await countUserDataTables(auth.supabase, auth.userId)
  return buildDataTableLimitState(count)
}

export async function listDataTableSummaries() {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return []
  }

  const { data, error } = await auth.supabase
    .from("data_tables")
    .select("name, columns")
    .eq("user_id", auth.userId)
    .order("name", { ascending: true })

  if (error || !data) {
    return []
  }

  return (data as Pick<DataTableRowDb, "name" | "columns">[]).map(
    (row) => mapDataTableSummary(row as DataTableRowDb)
  )
}

export async function getDataTableByName(name: string): Promise<DataTable | null> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    return null
  }

  const normalizedName = normalizeTableName(name)

  const { data, error } = await auth.supabase
    .from("data_tables")
    .select("*")
    .eq("user_id", auth.userId)

  if (error || !data) {
    return null
  }

  const row = (data as DataTableRowDb[]).find(
    (entry) => entry.name.trim().toLowerCase() === normalizedName.toLowerCase()
  )

  if (!row) {
    return null
  }

  const rowCount = await countRowsForTable(auth.supabase, auth.userId, row.id)
  return mapDataTableRow(row, rowCount)
}

export async function getDataTable(tableId: string): Promise<DataTable | null> {
  const auth = await getAuthenticatedUserId()
  if (!auth || !isPersistedDataTableId(tableId)) {
    return null
  }

  const { data, error } = await auth.supabase
    .from("data_tables")
    .select("*")
    .eq("id", tableId)
    .eq("user_id", auth.userId)
    .maybeSingle()

  if (error || !data) {
    return null
  }

  const rowCount = await countRowsForTable(auth.supabase, auth.userId, tableId)
  return mapDataTableRow(data as DataTableRowDb, rowCount)
}

export async function createDataTable(
  name?: string,
  description?: string
): Promise<DataTable> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to create tables.")
  }

  await assertDataTableLimitNotReached(auth.supabase, auth.userId)

  const parsedName = parseResourceName(name ?? "", "Untitled table")
  if (!parsedName.ok) {
    throw new Error(parsedName.error)
  }

  const parsedDescription = parseOptionalDescription(description)
  if (!parsedDescription.ok) {
    throw new Error(parsedDescription.error)
  }

  const uniqueName = await generateUniqueTableName(
    auth.supabase,
    auth.userId,
    parsedName.name
  )

  const { data, error } = await auth.supabase
    .from("data_tables")
    .insert({
      user_id: auth.userId,
      name: uniqueName,
      description: parsedDescription.description,
      columns: [{ key: "field_1", label: "Field 1", type: "string" }],
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to create table.")
  }

  return mapDataTableRow(data as DataTableRowDb, 0)
}

export type SaveDataTableInput = {
  id: string
  name: string
  description?: string
  columns: DataTable["columns"]
}

export async function saveDataTable(input: SaveDataTableInput): Promise<DataTable> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to save tables.")
  }

  if (!isPersistedDataTableId(input.id)) {
    throw new Error("Table not found.")
  }

  const validated = validateSaveDataTableInput(input)
  if (!validated.ok) {
    throw new Error(validated.error)
  }

  const payload = {
    name: validated.data.name,
    description: validated.data.description ?? null,
    columns: validated.data.columns,
    updated_at: new Date().toISOString(),
  }

  await assertUniqueTableName(
    auth.supabase,
    auth.userId,
    payload.name,
    input.id
  )

  const { data, error } = await auth.supabase
    .from("data_tables")
    .update(payload)
    .eq("id", input.id)
    .eq("user_id", auth.userId)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save table.")
  }

  const rowCount = await countRowsForTable(auth.supabase, auth.userId, input.id)
  return mapDataTableRow(data as DataTableRowDb, rowCount)
}

export async function deleteDataTable(tableId: string): Promise<void> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to delete tables.")
  }

  if (!isPersistedDataTableId(tableId)) {
    throw new Error("Table not found.")
  }

  const { error } = await auth.supabase
    .from("data_tables")
    .delete()
    .eq("id", tableId)
    .eq("user_id", auth.userId)

  if (error) {
    throw new Error(error.message ?? "Failed to delete table.")
  }
}

export async function duplicateDataTable(tableId: string): Promise<DataTable> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to duplicate tables.")
  }

  if (!isPersistedDataTableId(tableId)) {
    throw new Error("Table not found.")
  }

  const source = await getDataTable(tableId)
  if (!source) {
    throw new Error("Table not found.")
  }

  await assertDataTableLimitNotReached(auth.supabase, auth.userId)

  const uniqueName = await generateUniqueTableName(
    auth.supabase,
    auth.userId,
    `${source.name} copy`
  )

  const { data, error } = await auth.supabase
    .from("data_tables")
    .insert({
      user_id: auth.userId,
      name: uniqueName,
      description: source.description ?? null,
      columns: source.columns,
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to duplicate table.")
  }

  const rows = await listDataTableRows(tableId)
  for (const row of rows) {
    await insertDataTableRow(data.id, row.data)
  }

  return mapDataTableRow(data as DataTableRowDb, rows.length)
}

export async function listDataTableRows(tableId: string): Promise<DataTableRow[]> {
  const auth = await getAuthenticatedUserId()
  if (!auth || !isPersistedDataTableId(tableId)) {
    return []
  }

  const { data, error } = await auth.supabase
    .from("data_table_rows")
    .select("*")
    .eq("table_id", tableId)
    .eq("user_id", auth.userId)
    .order("created_at", { ascending: true })

  if (error || !data) {
    return []
  }

  return (data as DataTableRowRecordDb[]).map(mapDataTableRowRecord)
}

export async function insertDataTableRow(
  tableId: string,
  rowData: Record<string, unknown>
): Promise<DataTableRow> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to add rows.")
  }

  if (!isPersistedDataTableId(tableId)) {
    throw new Error("Table not found.")
  }

  const { data, error } = await auth.supabase
    .from("data_table_rows")
    .insert({
      table_id: tableId,
      user_id: auth.userId,
      row_data: rowData,
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to add row.")
  }

  return mapDataTableRowRecord(data as DataTableRowRecordDb)
}

export async function updateDataTableRow(
  rowId: string,
  rowData: Record<string, unknown>
): Promise<DataTableRow> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to update rows.")
  }

  const { data, error } = await auth.supabase
    .from("data_table_rows")
    .update({
      row_data: rowData,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rowId)
    .eq("user_id", auth.userId)
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to update row.")
  }

  return mapDataTableRowRecord(data as DataTableRowRecordDb)
}

export async function deleteDataTableRow(rowId: string): Promise<void> {
  const auth = await getAuthenticatedUserId()
  if (!auth) {
    throw new Error("Sign in to delete rows.")
  }

  const { error } = await auth.supabase
    .from("data_table_rows")
    .delete()
    .eq("id", rowId)
    .eq("user_id", auth.userId)

  if (error) {
    throw new Error(error.message ?? "Failed to delete row.")
  }
}
