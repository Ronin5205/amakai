"use client"

import * as React from "react"
import { PlusIcon, TrashIcon } from "@phosphor-icons/react"

import type {
  FieldEditRow,
  FieldRenameRow,
  SwitchCaseRule,
  UpstreamFieldOption,
} from "@/lib/design/upstream-fields"
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

export function OutputFieldsEditor({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string
  value: string[]
  onChange: (value: string[]) => void
}) {
  const rows = value.length > 0 ? value : [""]

  const updateRow = (index: number, nextValue: string) => {
    const next = [...rows]
    next[index] = nextValue
    onChange(next.map((entry) => entry.trim()).filter(Boolean))
  }

  const addRow = () => onChange([...rows.filter(Boolean), ""])

  const removeRow = (index: number) => {
    onChange(rows.filter((_, rowIndex) => rowIndex !== index).filter(Boolean))
  }

  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Output field</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={`${idPrefix}-output-${index}`}>
              <TableCell>
                <Input
                  id={`${idPrefix}-output-${index}`}
                  value={row}
                  placeholder="field name"
                  onChange={(event) => updateRow(index, event.target.value)}
                />
              </TableCell>
              <TableCell>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={rows.length <= 1 && !row}
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
  upstreamOptions,
  onChange,
}: {
  idPrefix: string
  value: FieldEditRow[]
  upstreamOptions: UpstreamFieldOption[]
  onChange: (value: FieldEditRow[]) => void
}) {
  const rows = value.length > 0 ? value : [{ name: "", sourceField: "" }]

  const updateRow = (index: number, patch: Partial<FieldEditRow>) => {
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
            <TableHead>Field</TableHead>
            <TableHead>Value from previous node</TableHead>
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
                  placeholder="field name"
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
                  onClick={() =>
                    onChange(rows.filter((_, rowIndex) => rowIndex !== index))
                  }
                  aria-label="Remove field"
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
        onClick={() => onChange([...rows, { name: "", sourceField: "" }])}
        disabled={upstreamOptions.length === 0}
      >
        <PlusIcon data-icon="inline-start" />
        Add field
      </Button>
      {upstreamOptions.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Connect a previous node to map values from its output.
        </p>
      ) : null}
    </div>
  )
}

export function SwitchRulesEditor({
  idPrefix,
  value,
  onChange,
}: {
  idPrefix: string
  value: SwitchCaseRule[]
  onChange: (value: SwitchCaseRule[]) => void
}) {
  return (
    <div className="space-y-2">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Output</TableHead>
            <TableHead>Condition</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {value.map((rule, index) => (
            <TableRow key={rule.portId}>
              <TableCell className="align-top text-xs font-medium">
                {rule.label}
              </TableCell>
              <TableCell>
                <Input
                  id={`${idPrefix}-switch-${index}`}
                  value={rule.condition}
                  placeholder="When should this output fire?"
                  onChange={(event) => {
                    const next = value.map((entry, rowIndex) =>
                      rowIndex === index
                        ? { ...entry, condition: event.target.value }
                        : entry
                    )
                    onChange(next)
                  }}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export { UpstreamFieldSelect }
