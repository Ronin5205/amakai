import type { Metadata } from "next"

import { TablesView } from "@/components/design/tables-view"
import { getDataTableLimitState, listDataTables } from "@/lib/data/data-tables"

export const metadata: Metadata = {
  title: "Tables",
}

export default async function TablesPage() {
  const [tables, tableLimit] = await Promise.all([
    listDataTables(),
    getDataTableLimitState(),
  ])

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
      <TablesView tables={tables} tableLimit={tableLimit} />
    </div>
  )
}
