"use client"

import * as React from "react"

import type { ConfigSchemaField } from "@/lib/domain/workflow"
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

function formatJsonValue(value: unknown) {
  if (value === undefined || value === null) {
    return ""
  }

  if (typeof value === "string") {
    return value
  }

  return JSON.stringify(value, null, 2)
}

function parseJsonValue(raw: string): unknown {
  const trimmed = raw.trim()
  if (!trimmed) {
    return undefined
  }

  return JSON.parse(trimmed) as unknown
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
  onChange,
}: {
  field: ConfigSchemaField
  value: unknown
  id: string
  onChange: (value: unknown) => void
}) {
  switch (field.type) {
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
          placeholder={field.placeholder}
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

    case "textarea":
    case "code":
    case "json":
      return (
        <Textarea
          id={id}
          value={
            field.type === "json"
              ? formatJsonValue(value)
              : typeof value === "string"
                ? value
                : value === undefined || value === null
                  ? ""
                  : String(value)
          }
          placeholder={field.placeholder}
          className={field.type === "code" || field.type === "json" ? "font-mono" : undefined}
          rows={field.type === "code" || field.type === "json" ? 5 : 3}
          onChange={(event) => {
            const next = event.target.value
            if (field.type === "json") {
              try {
                onChange(parseJsonValue(next))
              } catch {
                onChange(next)
              }
              return
            }
            onChange(next || undefined)
          }}
        />
      )

    default:
      return (
        <Input
          id={id}
          value={typeof value === "string" ? value : value === undefined || value === null ? "" : String(value)}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value || undefined)}
        />
      )
  }
}

export function NodeConfigFields({
  fields,
  values,
  idPrefix,
  onChange,
}: NodeConfigFieldsProps) {
  if (fields.length === 0) {
    return null
  }

  return (
    <>
      {fields.map((field) => {
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
              onChange={(next) => onChange(field.key, next)}
            />
            {field.description ? (
              <FieldDescription>{field.description}</FieldDescription>
            ) : null}
          </Field>
        )
      })}
    </>
  )
}
