"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  GearIcon,
  PlusIcon,
  TableIcon,
} from "@phosphor-icons/react"

import { DeleteDataTableDialog } from "@/components/design/delete-data-table-dialog"
import { ResourceRowActionsMenu } from "@/components/design/resource-row-actions-menu"
import {
  createDataTableAction,
  deleteDataTableAction,
  duplicateDataTableAction,
} from "@/lib/actions/data-table-actions"
import type { DataTable } from "@/lib/domain/data-table"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@amakai/shared/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amakai/shared/components/ui/table"

export interface TablesViewProps {
  tables: DataTable[]
}

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function TablesView({ tables: initialTables }: TablesViewProps) {
  const router = useRouter()
  const [tables, setTables] = React.useState(initialTables)
  const [isCreating, setIsCreating] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = React.useState<string | null>(null)
  const [tableToDelete, setTableToDelete] = React.useState<DataTable | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setTables(initialTables)
  }, [initialTables])

  const handleCreate = async () => {
    setError(null)
    setIsCreating(true)

    const result = await createDataTableAction()

    setIsCreating(false)

    if ("error" in result) {
      setError(result.error)
      return
    }

    router.push(`/design/tables/${result.table.id}`)
  }

  const handleDuplicate = async (table: DataTable) => {
    setError(null)
    setDuplicatingId(table.id)

    const result = await duplicateDataTableAction(table.id)

    setDuplicatingId(null)

    if ("error" in result) {
      setError(result.error)
      return
    }

    setTables((current) => [result.table, ...current])
  }

  const handleDeleteConfirm = async () => {
    if (!tableToDelete) {
      return
    }

    setError(null)
    setDeletingId(tableToDelete.id)

    const result = await deleteDataTableAction(tableToDelete.id)

    setDeletingId(null)

    if ("error" in result) {
      setError(result.error)
      return
    }

    setTables((current) => current.filter((item) => item.id !== tableToDelete.id))
    setTableToDelete(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-3">
          <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Design
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              Tables
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Create tables, define columns, and edit data in the spreadsheet
              editor. Workflows reference tables by name.
            </p>
          </div>
        </div>

        <Button onClick={handleCreate} disabled={isCreating}>
          <PlusIcon data-icon="inline-start" />
          {isCreating ? "Creating…" : "New table"}
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {tables.length === 0 ? (
        <Empty className="min-h-[320px] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TableIcon />
            </EmptyMedia>
            <EmptyTitle>No tables yet</EmptyTitle>
            <EmptyDescription>
              Create a table, set up its columns, then edit rows in the
              spreadsheet editor.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={handleCreate} disabled={isCreating}>
              <PlusIcon data-icon="inline-start" />
              Create table
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Columns</TableHead>
                <TableHead>Rows</TableHead>
                <TableHead>Last updated</TableHead>
                <TableHead className="w-[220px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tables.map((table) => (
                <TableRow key={table.id}>
                  <TableCell className="font-medium">{table.name}</TableCell>
                  <TableCell>{table.columns.length}</TableCell>
                  <TableCell>{table.rowCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatUpdatedAt(table.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <Link href={`/design/tables/${table.id}/data`} />
                        }
                      >
                        <TableIcon data-icon="inline-start" />
                        Open
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <Link href={`/design/tables/${table.id}`} />
                        }
                      >
                        <GearIcon data-icon="inline-start" />
                        Columns
                      </Button>
                      <ResourceRowActionsMenu
                        isDuplicating={duplicatingId === table.id}
                        isDeleting={deletingId === table.id}
                        onDuplicate={() => handleDuplicate(table)}
                        onDelete={() => setTableToDelete(table)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {tables.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Tip: set up columns first, then use Open to fill in rows. Table names
          must be unique.
        </p>
      ) : null}

      <DeleteDataTableDialog
        open={tableToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setTableToDelete(null)
          }
        }}
        tableName={tableToDelete?.name ?? "Table"}
        isDeleting={tableToDelete !== null && deletingId === tableToDelete.id}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
