"use client"

import * as React from "react"

import {
  FieldEditTableEditor,
  FieldRenameTableEditor,
  OutputFieldsEditor,
  SwitchRulesEditor,
  UpstreamFieldSelect,
} from "@/components/design/node-config-custom-fields"
import type { ConfigSchemaField, WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import {
  asEditRows,
  asRenameRows,
  asStringArray,
  buildDefaultSwitchCases,
  normalizeSwitchCases,
  resolveUpstreamFieldOptions,
} from "@/lib/design/upstream-fields"
import { Input } from "@amakai/shared/components/ui/input"
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@amakai/shared/components/ui/field"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@amakai/shared/components/ui/select"
import { Textarea } from "@amakai/shared/components/ui/textarea"
import { Toggle } from "@amakai/shared/components/ui/toggle"

export interface NodeConfigFieldsProps {
  node: WorkflowNode
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  fields: ConfigSchemaField[]
  values: Record<string, unknown>
  idPrefix: string
  onChange: (key: string, value: unknown) => void
}

function readFieldValue(
  values: Record<string, unknown>,
  field: ConfigSchemaField
) {
  const value = values[field.key]
  if (value !== undefined && value !== null) {
    return value
  }
  return field.defaultValue
}

function ConfigSelectField({
  id,
  value,
  options,
  onChange,
}: {
  id: string
  value: unknown
  options: NonNullable<ConfigSchemaField["options"]>
  onChange: (value: unknown) => void
}) {
  const items = React.useMemo(
    () => [
      { label: "Select…", value: null },
      ...options.map((option) => ({
        label: option.label,
        value: option.value,
      })),
    ],
    [options]
  )
  const selectedValue = typeof value === "string" ? value : null

  return (
    <Select
      items={items}
      value={selectedValue}
      onValueChange={(next) => onChange(next ?? undefined)}
    >
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} side="bottom">
        <SelectGroup>
          {items.map((item) => (
            <SelectItem
              key={item.value ?? "__placeholder__"}
              value={item.value}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function ConfigField({
  field,
  value,
  id,
  node,
  nodes,
  edges,
  values,
  onChange,
}: {
  field: ConfigSchemaField
  value: unknown
  id: string
  node: WorkflowNode
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  values: Record<string, unknown>
  onChange: (value: unknown) => void
}) {
  const upstreamOptions = React.useMemo(
    () => resolveUpstreamFieldOptions(nodes, edges, node.id),
    [edges, node.id, nodes]
  )

  switch (field.type) {
    case "output-fields":
      return (
        <OutputFieldsEditor
          idPrefix={id}
          value={asStringArray(value)}
          onChange={onChange}
        />
      )

    case "field-rename-table":
      return (
        <FieldRenameTableEditor
          idPrefix={id}
          value={asRenameRows(value)}
          upstreamOptions={upstreamOptions}
          onChange={onChange}
        />
      )

    case "field-edit-table":
      return (
        <FieldEditTableEditor
          idPrefix={id}
          value={asEditRows(value)}
          upstreamOptions={upstreamOptions}
          onChange={onChange}
        />
      )

    case "switch-rules": {
      const caseCount = Math.max(2, Number(values.caseCount ?? 2))
      const includeDefault = values.includeDefaultOutput !== false
      const rules = normalizeSwitchCases(value, caseCount, includeDefault)
      return (
        <SwitchRulesEditor
          idPrefix={id}
          value={rules}
          onChange={onChange}
        />
      )
    }

    case "upstream-field":
      return (
        <UpstreamFieldSelect
          id={id}
          value={typeof value === "string" ? value : ""}
          options={upstreamOptions}
          onChange={onChange}
        />
      )

    case "boolean":
      return (
        <Toggle
          id={id}
          pressed={Boolean(value)}
          onPressedChange={(pressed) => onChange(pressed)}
          variant="outline"
          size="sm"
          aria-label={field.label}
        >
          {value ? "Enabled" : "Disabled"}
        </Toggle>
      )

    case "number":
      return (
        <Input
          id={id}
          type="number"
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(event) => {
            const next = event.target.value
            onChange(next === "" ? undefined : Number(next))
          }}
        />
      )

    case "select":
      return (
        <ConfigSelectField
          id={id}
          value={value}
          options={field.options ?? []}
          onChange={onChange}
        />
      )

    case "json":
      return null

    case "textarea":
    case "code":
      return (
        <Textarea
          id={id}
          value={
            typeof value === "string"
              ? value
              : value === undefined || value === null
                ? ""
                : String(value)
          }
          placeholder={field.placeholder}
          className={field.type === "code" ? "font-mono" : undefined}
          rows={field.type === "code" ? 5 : 3}
          onChange={(event) => onChange(event.target.value || undefined)}
        />
      )

    default:
      return (
        <Input
          id={id}
          value={
            typeof value === "string"
              ? value
              : value === undefined || value === null
                ? ""
                : String(value)
          }
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value || undefined)}
        />
      )
  }
}

export function NodeConfigFields({
  node,
  nodes,
  edges,
  fields,
  values,
  idPrefix,
  onChange,
}: NodeConfigFieldsProps) {
  const visibleFields = fields.filter(
    (field) => field.key !== "catalogItemId" && field.type !== "json"
  )

  if (visibleFields.length === 0) {
    return null
  }

  const handleChange = (field: ConfigSchemaField, next: unknown) => {
    onChange(field.key, next)

    if (field.key === "caseCount" || field.key === "includeDefaultOutput") {
      const caseCount = Math.max(
        2,
        Number(field.key === "caseCount" ? next : values.caseCount ?? 2)
      )
      const includeDefault =
        field.key === "includeDefaultOutput"
          ? next !== false
          : values.includeDefaultOutput !== false

      onChange(
        "switchCases",
        buildDefaultSwitchCases(caseCount, includeDefault).map((rule) => {
          const existing = normalizeSwitchCases(
            values.switchCases,
            caseCount,
            includeDefault
          ).find((entry) => entry.portId === rule.portId)
          return existing ?? rule
        })
      )
    }
  }

  return (
    <>
      {visibleFields.map((field) => {
        const fieldId = `${idPrefix}-${field.key}`
        const value = readFieldValue(values, field)

        return (
          <Field key={field.key}>
            <FieldLabel htmlFor={fieldId}>
              {field.label}
              {field.required ? " *" : ""}
            </FieldLabel>
            <ConfigField
              field={field}
              value={value}
              id={fieldId}
              node={node}
              nodes={nodes}
              edges={edges}
              values={values}
              onChange={(next) => handleChange(field, next)}
            />
            {field.description ? (
              <FieldDescription>{field.description}</FieldDescription>
            ) : null}
            {field.type === "upstream-field" &&
            resolveUpstreamFieldOptions(nodes, edges, node.id).length === 0 ? (
              <FieldDescription>
                Connect a previous node to map fields from its JSON output.
              </FieldDescription>
            ) : null}
          </Field>
        )
      })}
    </>
  )
}
