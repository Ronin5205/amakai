"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, GearIcon, TrashIcon } from "@phosphor-icons/react"

import {
  deleteDataTableRowAction,
  insertDataTableRowAction,
  updateDataTableRowAction,
} from "@/lib/actions/data-table-actions"
import type {
  DataTable,
  DataTableColumn,
  DataTableColumnType,
  DataTableRow,
} from "@/lib/domain/data-table"
import { Button } from "@amakai/shared/components/ui/button"
import { cn } from "@amakai/shared/lib/utils"

const ROW_SAVE_DEBOUNCE_MS = 600

export interface TableDataEditorProps {
  table: DataTable
  initialRows: DataTableRow[]
}

type EditorRow = DataTableRow & {
  /** Stable React key — never changes for a row the user is editing. */
  clientKey: string
}

function defaultValueForColumn(column: DataTableColumn) {
  switch (column.type) {
    case "number":
      return ""
    case "boolean":
      return false
    case "json":
      return ""
    default:
      return ""
  }
}

function formatCellValue(value: unknown, type: DataTableColumnType) {
  if (type === "json") {
    return typeof value === "string"
      ? value
      : value === undefined || value === null
        ? ""
        : JSON.stringify(value)
  }
  if (type === "boolean") {
    return value === true ? "true" : "false"
  }
  if (value === undefined || value === null) {
    return ""
  }
  return String(value)
}

function parseCellValue(raw: string, type: DataTableColumnType): unknown {
  switch (type) {
    case "number": {
      if (raw.trim() === "") return ""
      const parsed = Number(raw)
      return Number.isNaN(parsed) ? 0 : parsed
    }
    case "boolean":
      return raw === "true"
    case "json":
      try {
        return raw.trim() ? JSON.parse(raw) : {}
      } catch {
        return raw
      }
    default:
      return raw
  }
}

function isRowEmpty(row: DataTableRow, columns: DataTableColumn[]) {
  return columns.every((column) => {
    const value = row.data[column.key]
    return (
      value === undefined ||
      value === null ||
      value === "" ||
      (column.type === "boolean" && value === false) ||
      (column.type === "json" &&
        (value === "{}" ||
          (typeof value === "object" &&
            value !== null &&
            Object.keys(value as object).length === 0)))
    )
  })
}

function toEditorRow(row: DataTableRow, clientKey?: string): EditorRow {
  return {
    ...row,
    clientKey: clientKey ?? row.id,
  }
}

function createDraftRow(tableId: string, columns: DataTableColumn[]): EditorRow {
  const clientKey = crypto.randomUUID()
  const now = new Date().toISOString()
  return {
    id: `draft-${clientKey}`,
    clientKey,
    tableId,
    data: Object.fromEntries(
      columns.map((column) => [column.key, defaultValueForColumn(column)])
    ),
    updatedAt: now,
    createdAt: now,
  }
}

function buildRowData(row: EditorRow, columns: DataTableColumn[]) {
  return Object.fromEntries(
    columns.map((column) => [
      column.key,
      parseCellValue(
        formatCellValue(row.data[column.key], column.type),
        column.type
      ),
    ])
  )
}

type GridCellProps = {
  column: DataTableColumn
  value: unknown
  liveUpdate: boolean
  onCommit: (raw: string) => void
  onNavigate: (direction: "next" | "prev") => void
  registerRef: (element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null) => void
}

function GridCell({
  column,
  value,
  liveUpdate,
  onCommit,
  onNavigate,
  registerRef,
}: GridCellProps) {
  const [draft, setDraft] = React.useState(formatCellValue(value, column.type))

  React.useEffect(() => {
    setDraft(formatCellValue(value, column.type))
  }, [column.type, value])

  const commit = (next = draft) => {
    onCommit(next)
  }

  const handleChange = (next: string) => {
    setDraft(next)
    if (liveUpdate) {
      onCommit(next)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && column.type !== "json") {
      event.preventDefault()
      commit()
      onNavigate("next")
    }
    if (event.key === "Tab") {
      event.preventDefault()
      commit()
      onNavigate(event.shiftKey ? "prev" : "next")
    }
  }

  if (column.type === "boolean") {
    return (
      <select
        ref={registerRef}
        className="h-full w-full bg-transparent px-2 py-1.5 text-sm outline-none focus:bg-accent/40"
        value={draft === "true" ? "true" : "false"}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
      >
        <option value="false">False</option>
        <option value="true">True</option>
      </select>
    )
  }

  if (column.type === "json") {
    return (
      <textarea
        ref={registerRef}
        className="min-h-[2rem] w-full resize-none bg-transparent px-2 py-1.5 font-mono text-xs outline-none focus:bg-accent/40"
        rows={1}
        value={draft}
        onChange={(event) => handleChange(event.target.value)}
        onBlur={() => commit()}
        onKeyDown={handleKeyDown}
      />
    )
  }

  return (
    <input
      ref={registerRef}
      type="text"
      inputMode={column.type === "number" ? "decimal" : "text"}
      className="h-full w-full bg-transparent px-2 py-1.5 text-sm outline-none focus:bg-accent/40"
      value={draft}
      onChange={(event) => handleChange(event.target.value)}
      onBlur={() => commit()}
      onKeyDown={handleKeyDown}
    />
  )
}

function ensureTrailingDraft(
  rows: EditorRow[],
  columns: DataTableColumn[],
  tableId: string
) {
  if (columns.length === 0) {
    return rows.filter((row) => !row.id.startsWith("draft-"))
  }

  const withoutDrafts = rows.filter((row) => !row.id.startsWith("draft-"))
  const existingDraft = rows.find((row) => row.id.startsWith("draft-"))

  if (existingDraft && isRowEmpty(existingDraft, columns)) {
    return [...withoutDrafts, existingDraft]
  }

  return [...withoutDrafts, createDraftRow(tableId, columns)]
}

function toInitialEditorRows(
  initialRows: DataTableRow[],
  columns: DataTableColumn[],
  tableId: string
) {
  return ensureTrailingDraft(
    initialRows.map((row) => toEditorRow(row)),
    columns,
    tableId
  )
}

export function TableDataEditor({ table, initialRows }: TableDataEditorProps) {
  const columns = table.columns
  const [rows, setRows] = React.useState(() =>
    toInitialEditorRows(initialRows, table.columns, table.id)
  )
  const [error, setError] = React.useState<string | null>(null)

  const rowsRef = React.useRef(rows)
  const pendingRowSavesRef = React.useRef(
    new Map<string, ReturnType<typeof setTimeout>>()
  )
  const pendingInsertsRef = React.useRef(new Set<string>())
  const cellRefs = React.useRef(
    new Map<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>()
  )
  const loadedTableIdRef = React.useRef(table.id)

  rowsRef.current = rows

  React.useEffect(() => {
    if (loadedTableIdRef.current === table.id) {
      return
    }
    loadedTableIdRef.current = table.id
    setRows(toInitialEditorRows(initialRows, table.columns, table.id))
  }, [initialRows, table.columns, table.id])

  React.useEffect(() => {
    const pending = pendingRowSavesRef.current
    return () => {
      for (const [rowId, timer] of pending.entries()) {
        clearTimeout(timer)
        const row = rowsRef.current.find((entry) => entry.id === rowId)
        if (row && !row.id.startsWith("draft-") && !row.id.startsWith("pending-")) {
          void updateDataTableRowAction(rowId, row.data)
        }
      }
      pending.clear()
    }
  }, [])

  const flushRowSave = React.useCallback(async (rowId: string) => {
    const row = rowsRef.current.find((entry) => entry.id === rowId)
    if (!row || row.id.startsWith("draft-") || row.id.startsWith("pending-")) {
      return
    }

    const result = await updateDataTableRowAction(rowId, row.data)
    if ("error" in result) {
      setError(result.error)
    }
  }, [])

  const scheduleRowSave = React.useCallback(
    (rowId: string) => {
      if (rowId.startsWith("draft-") || rowId.startsWith("pending-")) {
        return
      }

      const pending = pendingRowSavesRef.current
      const existing = pending.get(rowId)
      if (existing) {
        clearTimeout(existing)
      }

      pending.set(
        rowId,
        setTimeout(() => {
          pending.delete(rowId)
          void flushRowSave(rowId)
        }, ROW_SAVE_DEBOUNCE_MS)
      )
    },
    [flushRowSave]
  )

  const queueRowInsert = React.useCallback(
    (clientKey: string) => {
      if (pendingInsertsRef.current.has(clientKey)) {
        return
      }
      pendingInsertsRef.current.add(clientKey)

      void (async () => {
        const latestRow = rowsRef.current.find(
          (entry) => entry.clientKey === clientKey
        )
        if (!latestRow) {
          pendingInsertsRef.current.delete(clientKey)
          return
        }

        const rowData = buildRowData(latestRow, columns)
        const result = await insertDataTableRowAction(table.id, rowData)
        pendingInsertsRef.current.delete(clientKey)

        if ("error" in result) {
          setRows((current) =>
            ensureTrailingDraft(
              current.filter((entry) => entry.clientKey !== clientKey),
              columns,
              table.id
            )
          )
          setError(result.error)
          return
        }

        const savedRow = toEditorRow(result.row, clientKey)
        const newestRow = rowsRef.current.find(
          (entry) => entry.clientKey === clientKey
        )

        setRows((current) =>
          current.map((entry) => {
            if (entry.clientKey !== clientKey) {
              return entry
            }
            return {
              ...savedRow,
              data: newestRow?.data ?? savedRow.data,
            }
          })
        )

        if (
          newestRow &&
          JSON.stringify(newestRow.data) !== JSON.stringify(result.row.data)
        ) {
          void updateDataTableRowAction(result.row.id, newestRow.data)
        }
      })()
    },
    [columns, table.id]
  )

  const promoteDraftRow = React.useCallback(
    (draftRow: EditorRow) => {
      if (pendingInsertsRef.current.has(draftRow.clientKey)) {
        return
      }

      const promoted: EditorRow = {
        ...draftRow,
        id: `pending-${draftRow.clientKey}`,
      }

      setRows((current) => {
        const rest = current.filter(
          (entry) => entry.clientKey !== draftRow.clientKey
        )
        return ensureTrailingDraft([...rest, promoted], columns, table.id)
      })

      queueRowInsert(promoted.clientKey)
    },
    [columns, queueRowInsert, table.id]
  )

  const updateCell = React.useCallback(
    (
      row: EditorRow,
      columnKey: string,
      raw: string,
      column: DataTableColumn
    ) => {
      const parsed = parseCellValue(raw, column.type)
      let nextRow: EditorRow | undefined

      setRows((current) =>
        current.map((entry) => {
          if (entry.clientKey !== row.clientKey) {
            return entry
          }
          nextRow = {
            ...entry,
            data: { ...entry.data, [columnKey]: parsed },
          }
          return nextRow
        })
      )

      if (!nextRow) {
        return
      }

      if (row.id.startsWith("draft-")) {
        if (!isRowEmpty(nextRow, columns)) {
          promoteDraftRow(nextRow)
        }
        return
      }

      scheduleRowSave(row.id)
    },
    [columns, promoteDraftRow, scheduleRowSave]
  )

  const deleteRow = React.useCallback(
    (row: EditorRow) => {
      const pending = pendingRowSavesRef.current.get(row.id)
      if (pending) {
        clearTimeout(pending)
        pendingRowSavesRef.current.delete(row.id)
      }
      pendingInsertsRef.current.delete(row.clientKey)

      const removed = rowsRef.current.find(
        (entry) => entry.clientKey === row.clientKey
      )
      setRows((current) =>
        ensureTrailingDraft(
          current.filter((entry) => entry.clientKey !== row.clientKey),
          columns,
          table.id
        )
      )

      if (
        !removed ||
        row.id.startsWith("draft-") ||
        row.id.startsWith("pending-")
      ) {
        return
      }

      void (async () => {
        const result = await deleteDataTableRowAction(row.id, table.id)
        if ("error" in result && removed) {
          setRows((current) =>
            ensureTrailingDraft(
              [...current.filter((entry) => entry.clientKey !== removed.clientKey), removed],
              columns,
              table.id
            )
          )
          setError(result.error)
        }
      })()
    },
    [columns, table.id]
  )

  const focusCell = (rowIndex: number, columnIndex: number) => {
    cellRefs.current.get(`${rowIndex}-${columnIndex}`)?.focus()
  }

  if (columns.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <Header table={table} />
        <p className="text-sm text-muted-foreground">
          Add columns before editing data.{" "}
          <Link
            href={`/design/tables/${table.id}`}
            className="underline underline-offset-4"
          >
            Configure columns
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <Header table={table} />
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="min-h-0 flex-1 overflow-auto border bg-background">
        <div
          className="grid min-w-max"
          style={{
            gridTemplateColumns: `3rem repeat(${columns.length}, minmax(140px, 1fr)) 2.75rem`,
          }}
        >
          <div className="sticky top-0 z-10 border-b border-r bg-muted/50 px-2 py-2 text-xs font-medium text-muted-foreground">
            #
          </div>
          {columns.map((column, index) => (
            <div
              key={`header-${index}`}
              className="sticky top-0 z-10 border-b border-r bg-muted/50 px-2 py-2 text-xs font-medium"
            >
              {column.label}
            </div>
          ))}
          <div
            className="sticky top-0 z-10 border-b bg-muted/50 px-1 py-2 text-xs font-medium text-muted-foreground"
            aria-hidden
          />

          {rows.map((row, rowIndex) => {
            const isDraft = row.id.startsWith("draft-")
            const rowNumber = rows
              .slice(0, rowIndex)
              .filter((entry) => !entry.id.startsWith("draft-")).length

            return (
              <React.Fragment key={row.clientKey}>
                <div
                  className={cn(
                    "flex items-center border-b border-r px-2 py-1 text-xs text-muted-foreground",
                    isDraft && "italic"
                  )}
                >
                  <span>{isDraft ? "" : rowNumber + 1}</span>
                </div>
                {columns.map((column, columnIndex) => (
                  <div
                    key={`${row.clientKey}-${columnIndex}`}
                    className="border-b border-r"
                  >
                    <GridCell
                      column={column}
                      value={row.data[column.key]}
                      liveUpdate={isDraft || row.id.startsWith("pending-")}
                      onCommit={(raw) =>
                        updateCell(row, column.key, raw, column)
                      }
                      onNavigate={(direction) => {
                        const colCount = columns.length
                        const nextCol =
                          direction === "next" ? columnIndex + 1 : columnIndex - 1
                        if (nextCol >= 0 && nextCol < colCount) {
                          focusCell(rowIndex, nextCol)
                          return
                        }
                        const nextRow =
                          direction === "next" ? rowIndex + 1 : rowIndex - 1
                        if (nextRow >= 0 && nextRow < rows.length) {
                          focusCell(
                            nextRow,
                            direction === "next" ? 0 : colCount - 1
                          )
                        }
                      }}
                      registerRef={(element) => {
                        const key = `${rowIndex}-${columnIndex}`
                        if (element) {
                          cellRefs.current.set(key, element)
                        } else {
                          cellRefs.current.delete(key)
                        }
                      }}
                    />
                  </div>
                ))}
                <div className="flex items-center justify-center border-b px-1 py-1">
                  {!isDraft ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Delete row ${rowNumber + 1}`}
                      title="Delete row"
                      onClick={() => deleteRow(row)}
                    >
                      <TrashIcon />
                    </Button>
                  ) : null}
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Header({ table }: { table: DataTable }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 px-0"
          render={<Link href="/design/tables" />}
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Tables
        </Button>
        <h1 className="truncate font-heading text-xl font-medium tracking-tight">
          {table.name}
        </h1>
      </div>
      <Button
        variant="outline"
        size="sm"
        render={<Link href={`/design/tables/${table.id}`} />}
      >
        <GearIcon data-icon="inline-start" />
        Columns
      </Button>
    </div>
  )
}
