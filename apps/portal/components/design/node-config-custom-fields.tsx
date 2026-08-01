"use client"

import * as React from "react"
import Link from "next/link"
import { PlusIcon, TrashIcon } from "@phosphor-icons/react"

import type { DataTableColumn, DataTableSummary, TableColumnMapRow } from "@/lib/domain/data-table"
import { buildDefaultColumnMappings } from "@/lib/domain/data-table"

import {
  MAX_EDIT_FIELD_COUNT,
  normalizeFieldEditRows,
} from "@/lib/design/edit-fields"
import type {
  FieldEditRow,
  FieldRenameRow,
  SwitchCaseRule,
  UpstreamFieldOption,
} from "@/lib/design/upstream-fields"
import { isSwitchDefaultCase } from "@/lib/design/switch-rules"
import { COMPARISON_OPERATORS } from "@/lib/design/comparison-rules"
import type { OutputFieldDef, OutputFieldType } from "@/lib/design/output-fields"
import { Button } from "@amakai/shared/components/ui/button"
import { Input } from "@amakai/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@amakai/shared/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amakai/shared/components/ui/table"

function UpstreamFieldSelect({
  id,
  value,
  options,
  onChange,
  placeholder = "Select a field…",
}: {
  id: string
  value: string
  options: UpstreamFieldOption[]
  onChange: (value: string) => void
  placeholder?: string
}) {
  const items = React.useMemo(
    () => [
      { label: placeholder, value: null },
      ...options.map((option) => ({
        label: option.label,
        value: option.value,
      })),
    ],
    [options, placeholder]
  )

  return (
    <Select
      items={items}
      value={value || null}
      onValueChange={(next) => onChange(typeof next === "string" ? next : "")}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} side="bottom">
        <SelectGroup>
          {items.map((item) => (
            <SelectItem key={item.value ?? "__empty__"} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

const OUTPUT_FIELD_TYPE_ITEMS: Array<{ value: OutputFieldType; label: string }> = [
  { value: "string", label: "Text" },
  { value: "array", label: "Array" },
  { value: "object", label: "Object" },
]

export function OutputFieldsEditor({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string
  value: OutputFieldDef[]
  onChange: (value: OutputFieldDef[]) => void
}) {
  const rows = value.length > 0 ? value : [{ name: "", type: "string" as const }]

  const updateRowName = (index: number, nextValue: string) => {
    onChange(
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, name: nextValue } : row
      )
    )
  }

  const updateRowType = (index: number, nextType: OutputFieldType) => {
    onChange(
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, type: nextType } : row
      )
    )
  }

  const addRow = () => {
    onChange([...rows, { name: "", type: "string" }])
  }

  const removeRow = (index: number) => {
    const nextRows = rows.filter((_, rowIndex) => rowIndex !== index)
    onChange(nextRows.length > 0 ? nextRows : [{ name: "", type: "string" }])
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Output field</TableHead>
            <TableHead className="w-32">Type</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${idPrefix}-output-${index}`}>
              <TableCell>
                <Input
                  id={`${idPrefix}-output-${index}`}
                  value={row.name}
                  placeholder="field name"
                  onChange={(event) => updateRowName(index, event.target.value)}
                />
              </TableCell>
              <TableCell>
                <Select
                  items={OUTPUT_FIELD_TYPE_ITEMS}
                  value={row.type}
                  onValueChange={(next) => {
                    if (
                      next === "string" ||
                      next === "array" ||
                      next === "object"
                    ) {
                      updateRowType(index, next)
                    }
                  }}
                >
                  <SelectTrigger
                    id={`${idPrefix}-output-type-${index}`}
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false} side="bottom">
                    <SelectGroup>
                      {OUTPUT_FIELD_TYPE_ITEMS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={rows.length <= 1 && !row.name}
                  onClick={() => removeRow(index)}
                  aria-label="Remove field"
                >
                  <TrashIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <PlusIcon data-icon="inline-start" />
        Add field
      </Button>
    </div>
  )
}

export function FieldRenameTableEditor({
  idPrefix,
  value,
  upstreamOptions,
  onChange,
}: {
  idPrefix: string
  value: FieldRenameRow[]
  upstreamOptions: UpstreamFieldOption[]
  onChange: (value: FieldRenameRow[]) => void
}) {
  const rows = value.length > 0 ? value : [{ fromField: "", toField: "" }]

  const updateRow = (index: number, patch: Partial<FieldRenameRow>) => {
    const next = rows.map((row, rowIndex) =>
      rowIndex === index ? { ...row, ...patch } : row
    )
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>From</TableHead>
            <TableHead>To</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${idPrefix}-rename-${index}`}>
              <TableCell>
                <UpstreamFieldSelect
                  id={`${idPrefix}-rename-from-${index}`}
                  value={row.fromField}
                  options={upstreamOptions}
                  onChange={(fromField) => updateRow(index, { fromField })}
                />
              </TableCell>
              <TableCell>
                <Input
                  id={`${idPrefix}-rename-to-${index}`}
                  value={row.toField}
                  placeholder="new name"
                  onChange={(event) =>
                    updateRow(index, { toField: event.target.value })
                  }
                />
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() =>
                    onChange(rows.filter((_, rowIndex) => rowIndex !== index))
                  }
                  aria-label="Remove rename"
                >
                  <TrashIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...rows, { fromField: "", toField: "" }])}
        disabled={upstreamOptions.length === 0}
      >
        <PlusIcon data-icon="inline-start" />
        Add rename
      </Button>
      {upstreamOptions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Connect a previous node to choose fields.
        </p>
      ) : null}
    </div>
  )
}

export function FieldEditTableEditor({
  idPrefix,
  value,
  fieldCount,
  upstreamOptions,
  onChange,
}: {
  idPrefix: string
  value: FieldEditRow[]
  fieldCount: number
  upstreamOptions: UpstreamFieldOption[]
  onChange: (value: FieldEditRow[]) => void
}) {
  const rows = normalizeFieldEditRows(value, fieldCount)

  const updateRow = (index: number, patch: Partial<FieldEditRow>) => {
    onChange(
      rows.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row
      )
    )
  }

  const setFieldCount = (count: number) => {
    const nextCount = Math.min(
      MAX_EDIT_FIELD_COUNT,
      Math.max(1, Math.floor(count))
    )
    onChange(normalizeFieldEditRows(rows, nextCount))
  }

  const removeRow = (index: number) => {
    if (fieldCount <= 1) {
      return
    }

    const nextRows = rows.filter((_, rowIndex) => rowIndex !== index)
    onChange(normalizeFieldEditRows(nextRows, fieldCount - 1))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {fieldCount} input/output pair{fieldCount === 1 ? "" : "s"}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={fieldCount <= 1}
            onClick={() => setFieldCount(fieldCount - 1)}
            aria-label="Remove mapping pair"
          >
            -
          </Button>
          <span className="min-w-6 text-center text-sm tabular-nums">
            {fieldCount}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={fieldCount >= MAX_EDIT_FIELD_COUNT}
            onClick={() => setFieldCount(fieldCount + 1)}
            aria-label="Add mapping pair"
          >
            +
          </Button>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Output field</TableHead>
            <TableHead>Source field</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${idPrefix}-edit-${index}`}>
              <TableCell>
                <Input
                  id={`${idPrefix}-edit-name-${index}`}
                  value={row.name}
                  placeholder={`output ${index + 1}`}
                  onChange={(event) => updateRow(index, { name: event.target.value })}
                />
              </TableCell>
              <TableCell>
                <UpstreamFieldSelect
                  id={`${idPrefix}-edit-source-${index}`}
                  value={row.sourceField}
                  options={upstreamOptions}
                  onChange={(sourceField) => updateRow(index, { sourceField })}
                />
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={fieldCount <= 1}
                  onClick={() => removeRow(index)}
                  aria-label="Remove field mapping"
                >
                  <TrashIcon />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setFieldCount(fieldCount + 1)}
        disabled={fieldCount >= MAX_EDIT_FIELD_COUNT}
      >
        <PlusIcon data-icon="inline-start" />
        Add mapping
      </Button>
      {upstreamOptions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Connect a previous node to pick source fields from its output.
        </p>
      ) : null}
    </div>
  )
}

export function SwitchRulesEditor({
  idPrefix,
  value,
  upstreamOptions,
  onChange,
}: {
  idPrefix: string
  value: SwitchCaseRule[]
  upstreamOptions: UpstreamFieldOption[]
  onChange: (value: SwitchCaseRule[]) => void
}) {
  const operatorItems = React.useMemo(
    () =>
      COMPARISON_OPERATORS.map((option) => ({
        label: option.label,
        value: option.value,
      })),
    []
  )

  const updateRule = (index: number, patch: Partial<SwitchCaseRule>) => {
    onChange(
      value.map((rule, rowIndex) =>
        rowIndex === index ? { ...rule, ...patch } : rule
      )
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Cases are checked in order. Each rule compares one upstream JSON field
        using a predefined operator — no JavaScript expressions.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Output</TableHead>
            <TableHead>Field</TableHead>
            <TableHead>Operator</TableHead>
            <TableHead>Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {value.map((rule, index) => (
            <TableRow key={rule.portId}>
              <TableCell className="align-top text-xs font-medium">
                {rule.label}
              </TableCell>
              {isSwitchDefaultCase(rule) ? (
                <TableCell colSpan={3} className="align-top text-xs text-muted-foreground">
                  Used when no other case matches.
                </TableCell>
              ) : (
                <>
                  <TableCell className="align-top">
                    <UpstreamFieldSelect
                      id={`${idPrefix}-switch-field-${index}`}
                      value={rule.field}
                      options={upstreamOptions}
                      onChange={(field) => updateRule(index, { field })}
                    />
                  </TableCell>
                  <TableCell className="align-top">
                    <Select
                      items={operatorItems}
                      value={rule.operator}
                      onValueChange={(next) => {
                        if (typeof next === "string") {
                          updateRule(index, {
                            operator: next as SwitchCaseRule["operator"],
                          })
                        }
                      }}
                    >
                      <SelectTrigger
                        id={`${idPrefix}-switch-operator-${index}`}
                        className="w-full"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false} side="bottom">
                        <SelectGroup>
                          {operatorItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="align-top">
                    <Input
                      id={`${idPrefix}-switch-value-${index}`}
                      value={rule.compareValue}
                      placeholder="Comparison value"
                      onChange={(event) =>
                        updateRule(index, { compareValue: event.target.value })
                      }
                    />
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {upstreamOptions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Connect a previous node to pick fields from its JSON output.
        </p>
      ) : null}
    </div>
  )
}

export { UpstreamFieldSelect }

export function TableSelectEditor({
  id,
  value,
  tables,
  onChange,
}: {
  id: string
  value: string
  tables: DataTableSummary[]
  onChange: (value: string) => void
}) {
  const items = React.useMemo(
    () => [
      { label: "Select a table…", value: null },
      ...tables.map((table) => ({
        label: table.name,
        value: table.name,
      })),
    ],
    [tables]
  )

  const selectedTable = React.useMemo(() => {
    if (!value) {
      return null
    }
    const normalized = value.trim().toLowerCase()
    return (
      tables.find((table) => table.name.trim().toLowerCase() === normalized) ??
      null
    )
  }, [tables, value])

  if (tables.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          No tables yet. Create one under Design → Tables.
        </p>
        <Button variant="outline" size="sm" render={<Link href="/design/tables" />}>
          <PlusIcon data-icon="inline-start" />
          Create table
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Select
        items={items}
        value={value || null}
        onValueChange={(next) => onChange(typeof next === "string" ? next : "")}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} side="bottom">
          <SelectGroup>
            {items.map((item) => (
              <SelectItem key={item.value ?? "__empty__"} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {selectedTable && selectedTable.columns.length > 0 ? (
        <TableColumnsPreview columns={selectedTable.columns} />
      ) : selectedTable ? (
        <p className="text-xs text-muted-foreground">
          This table has no columns yet.{" "}
          <Link href="/design/tables" className="underline underline-offset-4">
            Add columns
          </Link>
        </p>
      ) : null}
    </div>
  )
}

function TableColumnsPreview({ columns }: { columns: DataTableColumn[] }) {
  return (
    <div className="border bg-muted/20">
      <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">
        Columns ({columns.length})
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead>Key</TableHead>
            <TableHead>Type</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {columns.map((column) => (
            <TableRow key={column.key}>
              <TableCell className="text-sm">{column.label}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {column.key}
              </TableCell>
              <TableCell className="text-xs capitalize text-muted-foreground">
                {column.type}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function TableColumnMapEditor({
  idPrefix,
  columns,
  value,
  upstreamOptions,
  onChange,
}: {
  idPrefix: string
  columns: DataTableColumn[]
  value: TableColumnMapRow[]
  upstreamOptions: UpstreamFieldOption[]
  onChange: (value: TableColumnMapRow[]) => void
}) {
  const rows = React.useMemo(
    () => buildDefaultColumnMappings(columns, value),
    [columns, value]
  )

  const updateRow = (columnKey: string, sourceField: string) => {
    onChange(
      rows.map((row) =>
        row.columnKey === columnKey ? { ...row, sourceField } : row
      )
    )
  }

  if (columns.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Select a table with columns to map values from the previous node.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Column</TableHead>
            <TableHead>Value from previous node</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {columns.map((column) => {
            const mapping = rows.find((row) => row.columnKey === column.key)
            return (
              <TableRow key={`${idPrefix}-${column.key}`}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">{column.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {column.key} · {column.type}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <UpstreamFieldSelect
                    id={`${idPrefix}-map-${column.key}`}
                    value={mapping?.sourceField ?? ""}
                    options={upstreamOptions}
                    onChange={(sourceField) => updateRow(column.key, sourceField)}
                    placeholder={
                      upstreamOptions.length === 0
                        ? "Connect a previous node…"
                        : "Select a field…"
                    }
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      {upstreamOptions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Connect a previous node to map its output fields into table columns.
        </p>
      ) : null}
    </div>
  )
}
