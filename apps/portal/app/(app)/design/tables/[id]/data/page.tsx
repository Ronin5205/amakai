import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { TableDataEditor } from "@/components/design/table-data-editor"
import { getDataTable, listDataTableRows } from "@/lib/data/data-tables"
import { isPersistedDataTableId } from "@/lib/data/data-table-mappers"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const table = await getDataTable(id)
  return {
    title: table?.name ?? "Table",
  }
}

export default async function TableDataPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!isPersistedDataTableId(id)) {
    redirect("/design/tables")
  }

  const [table, rows] = await Promise.all([
    getDataTable(id),
    listDataTableRows(id),
  ])

  if (!table) {
    notFound()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col p-4 md:p-6 lg:p-8">
      <TableDataEditor table={table} initialRows={rows} />
    </div>
  )
}
