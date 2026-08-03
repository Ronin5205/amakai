import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { TableSchemaView } from "@/components/design/table-schema-view"
import { getDataTable } from "@/lib/data/data-tables"
import { isPersistedDataTableId } from "@/lib/data/data-table-mappers"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const table = await getDataTable(id)
  return {
    title: table ? `${table.name} · Columns` : "Table",
  }
}

export default async function TableSchemaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!isPersistedDataTableId(id)) {
    redirect("/design/tables")
  }

  const table = await getDataTable(id)

  if (!table) {
    notFound()
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
      <TableSchemaView table={table} />
    </div>
  )
}
