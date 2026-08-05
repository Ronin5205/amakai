"use client"

import * as React from "react"

import { SchedulePickerEditor } from "@/components/design/schedule-picker-editor"
import {
  FieldEditTableEditor,
  FieldRenameTableEditor,
  OutputFieldsEditor,
  SwitchRulesEditor,
  TableColumnMapEditor,
  TableColumnSelectEditor,
  TableSelectEditor,
  UpstreamFieldSelect,
} from "@/components/design/node-config-custom-fields"
import {
  IntegrationConfigCascade,
  SecretSelectEditor,
} from "@/components/design/integration-config-field"
import type { ConfigSchemaField, WorkflowEdge, WorkflowNode } from "@/lib/domain/workflow"
import {
  buildDefaultColumnMappings,
  findDataTableSummary,
  type DataTableSummary,
} from "@/lib/domain/data-table"
import type { SecretKind, SecretSummary } from "@/lib/domain/secret"
import { isSecretKind } from "@/lib/domain/secret"
import { createDefaultTriggerSchedule, parseTriggerSchedule } from "@/lib/domain/trigger-schedule"
import {
  applyTriggerModeDefaults,
  type TriggerMode,
} from "@/lib/design/trigger-config"
import {
  asEditRows,
  asRenameRows,
  asStringArray,
  asTableColumnMapRows,
  buildDefaultSwitchCases,
  normalizeSwitchCases,
  resolveUpstreamFieldOptions,
} from "@/lib/design/upstream-fields"
import {
  getEditFieldCount,
  MAX_EDIT_FIELD_COUNT,
  normalizeFieldEditRows,
} from "@/lib/design/edit-fields"
import {
  parseOutputFieldDefs,
  serializeOutputFieldDefs,
  type OutputFieldDef,
} from "@/lib/design/output-fields"
import {
  clampNodeConfigNumber,
  clampNodeConfigString,
} from "@/lib/validation/workflow-node-config"
import {
  CODE_MAX_LENGTH,
  COMPARE_VALUE_MAX_LENGTH,
  ERROR_MESSAGE_MAX_LENGTH,
  APPROVER_EMAIL_MAX_LENGTH,
  APPROVER_ROLE_MAX_LENGTH,
  MERGE_INPUT_MAX,
  MERGE_INPUT_MIN,
  SWITCH_CASE_MAX,
  SWITCH_CASE_MIN,
  WAIT_DURATION_MS_MAX,
  WAIT_DURATION_MS_MIN,
} from "@/lib/validation/limits"
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
  dataTables?: DataTableSummary[]
  secrets?: SecretSummary[]
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
  dataTables,
  secrets,
  onFieldChange,
  onChange,
}: {
  field: ConfigSchemaField
  value: unknown
  id: string
  node: WorkflowNode
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  values: Record<string, unknown>
  dataTables?: DataTableSummary[]
  secrets?: SecretSummary[]
  onFieldChange: (key: string, value: unknown) => void
  onChange: (value: unknown) => void
}) {
  const upstreamOptions = React.useMemo(
    () => resolveUpstreamFieldOptions(nodes, edges, node.id),
    [edges, node.id, nodes]
  )

  switch (field.type) {
    case "integration-config":
      return (
        <IntegrationConfigCascade
          idPrefix={id}
          nodeKind={node.kind}
          values={values}
          onChange={onFieldChange}
        />
      )

    case "secret-select": {
      const kinds = (field.secretKinds ?? [])
        .filter((kind): kind is SecretKind => isSecretKind(kind))
      return (
        <SecretSelectEditor
          id={id}
          value={typeof value === "string" ? value : ""}
          secrets={secrets ?? []}
          secretKinds={kinds.length > 0 ? kinds : undefined}
          onChange={onChange}
        />
      )
    }

    case "output-fields":
      return (
        <OutputFieldsEditor
          idPrefix={id}
          value={parseOutputFieldDefs(values)}
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

    case "field-edit-table": {
      const fieldCount = getEditFieldCount(values)
      const rows = normalizeFieldEditRows(value, fieldCount)
      return (
        <FieldEditTableEditor
          idPrefix={id}
          value={rows}
          fieldCount={fieldCount}
          upstreamOptions={upstreamOptions}
          onChange={onChange}
        />
      )
    }

    case "switch-rules": {
      const caseCount = Math.max(2, Number(values.caseCount ?? 2))
      const includeDefault = values.includeDefaultOutput === true
      const rules = normalizeSwitchCases(value, caseCount, includeDefault)
      return (
        <SwitchRulesEditor
          idPrefix={id}
          value={rules}
          upstreamOptions={upstreamOptions}
          onChange={onChange}
        />
      )
    }

    case "table-select":
      return (
        <TableSelectEditor
          id={id}
          value={typeof value === "string" ? value : ""}
          tables={dataTables ?? []}
          onChange={onChange}
        />
      )

    case "table-column-map": {
      const tableName = typeof values.tableName === "string" ? values.tableName : ""
      const selectedTable = findDataTableSummary(dataTables ?? [], tableName)
      return (
        <TableColumnMapEditor
          idPrefix={id}
          columns={selectedTable?.columns ?? []}
          value={asTableColumnMapRows(value)}
          upstreamOptions={upstreamOptions}
          onChange={onChange}
        />
      )
    }

    case "table-column-select": {
      const tableName = typeof values.tableName === "string" ? values.tableName : ""
      const selectedTable = findDataTableSummary(dataTables ?? [], tableName)
      return (
        <TableColumnSelectEditor
          id={id}
          columns={selectedTable?.columns ?? []}
          value={typeof value === "string" ? value : ""}
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

    case "schedule-picker":
      return (
        <SchedulePickerEditor id={id} value={value} onChange={onChange} />
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

    case "number": {
      const numberLimits: Record<
        string,
        { min: number; max: number } | undefined
      > = {
        fieldCount: { min: 1, max: MAX_EDIT_FIELD_COUNT },
        inputCount: { min: MERGE_INPUT_MIN, max: MERGE_INPUT_MAX },
        caseCount: { min: SWITCH_CASE_MIN, max: SWITCH_CASE_MAX },
        durationMs: { min: WAIT_DURATION_MS_MIN, max: WAIT_DURATION_MS_MAX },
      }
      const limits = numberLimits[field.key]

      return (
        <Input
          id={id}
          type="number"
          min={limits?.min}
          max={limits?.max}
          value={value === undefined || value === null ? "" : String(value)}
          onChange={(event) => {
            const next = event.target.value
            if (next === "") {
              onChange(undefined)
              return
            }
            const parsed = Number(next)
            if (!Number.isFinite(parsed)) {
              return
            }
            onChange(clampNodeConfigNumber(field.key, parsed))
          }}
        />
      )
    }

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
    case "code": {
      const maxLength =
        field.key === "code"
          ? CODE_MAX_LENGTH
          : field.key === "errorMessage"
            ? ERROR_MESSAGE_MAX_LENGTH
            : undefined

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
          maxLength={maxLength}
          onChange={(event) => {
            const next = clampNodeConfigString(field.key, event.target.value)
            onChange(next || undefined)
          }}
        />
      )
    }

    default: {
      const maxLength =
        field.key === "compareValue" || field.key === "findValue"
          ? COMPARE_VALUE_MAX_LENGTH
          : field.key === "approverEmail"
            ? APPROVER_EMAIL_MAX_LENGTH
            : field.key === "approverRole"
              ? APPROVER_ROLE_MAX_LENGTH
              : undefined

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
          maxLength={maxLength}
          onChange={(event) => {
            const next = clampNodeConfigString(field.key, event.target.value)
            onChange(next || undefined)
          }}
        />
      )
    }
  }
}

export function NodeConfigFields({
  node,
  nodes,
  edges,
  fields,
  values,
  idPrefix,
  dataTables,
  secrets,
  onChange,
}: NodeConfigFieldsProps) {
  const visibleFields = fields.filter((field) => {
    if (field.key === "catalogItemId" || field.type === "json") {
      return false
    }
    if (field.type === "table-column-map" && values.operation !== "write") {
      return false
    }
    if (
      (field.key === "writeMode" ||
        field.key === "matchColumn" ||
        field.key === "matchValueField") &&
      values.operation !== "write"
    ) {
      return false
    }
    if (
      (field.key === "matchColumn" || field.key === "matchValueField") &&
      values.writeMode !== "upsert"
    ) {
      return false
    }
    if (
      (field.key === "enableFind" ||
        field.key === "findColumn" ||
        field.key === "findOperator" ||
        field.key === "findValue" ||
        field.key === "findValueField") &&
      values.operation !== "read"
    ) {
      return false
    }
    if (
      (field.key === "findColumn" ||
        field.key === "findOperator" ||
        field.key === "findValue" ||
        field.key === "findValueField") &&
      values.enableFind !== true
    ) {
      return false
    }
    if (field.key === "approverEmail" && values.approverType !== "email") {
      return false
    }
    if (field.key === "approverRole" && values.approverType !== "role") {
      return false
    }
    if (
      field.key === "fieldCount" &&
      fields.some((entry) => entry.type === "field-edit-table")
    ) {
      return false
    }
    if (
      field.key === "secretName" &&
      values.authMode !== undefined &&
      values.authMode !== "secret"
    ) {
      return false
    }
    if (
      (field.key === "publicApiKey" || field.key === "publicCredentials") &&
      values.authMode !== "public"
    ) {
      return false
    }

    const triggerMode =
      typeof values.triggerMode === "string"
        ? values.triggerMode
        : typeof values.triggerType === "string"
          ? values.triggerType
          : undefined

    if (
      (field.type === "schedule-picker" || field.key === "schedule") &&
      triggerMode !== "schedule"
    ) {
      return false
    }

    if (
      field.type === "integration-config" &&
      triggerMode !== "integration"
    ) {
      return false
    }

    if (
      triggerMode !== "integration" &&
      (field.key === "webhookToken" ||
        field.key === "authMode" ||
        field.key === "secretName" ||
        field.key === "publicApiKey") &&
      triggerMode !== "webhook" &&
      triggerMode !== "signal"
    ) {
      return false
    }

    return true
  })

  if (visibleFields.length === 0) {
    return null
  }

  const handleChange = (field: ConfigSchemaField, next: unknown) => {
    if (field.type === "output-fields" && Array.isArray(next)) {
      const defs = (next as OutputFieldDef[]).map((def) => ({
        name: def.name,
        type: def.type,
      }))
      const serialized = serializeOutputFieldDefs(defs)
      onChange("outputFieldDefs", defs)
      onChange("outputFields", serialized.outputFields)
      onChange("outputFieldTypes", serialized.outputFieldTypes)
      return
    }

    onChange(field.key, next)

    if (field.key === "triggerMode" || field.key === "triggerType") {
      const mode = next as TriggerMode
      if (
        mode === "manual" ||
        mode === "schedule" ||
        mode === "webhook" ||
        mode === "signal" ||
        mode === "integration"
      ) {
        const defaults = applyTriggerModeDefaults(mode, {
          ...values,
          triggerMode: mode,
        })
        onChange("triggerMode", mode)
        if (mode !== "integration") {
          onChange("triggerType", mode)
        }
        if (mode === "schedule" && !parseTriggerSchedule(values.schedule)) {
          onChange("schedule", createDefaultTriggerSchedule())
        }
        if (mode === "integration") {
          onChange("service", defaults.service)
          onChange("provider", defaults.provider)
          onChange("operation", defaults.operation)
          onChange("authMode", defaults.authMode)
          onChange("outputFieldDefs", defaults.outputFieldDefs)
          onChange("outputFields", defaults.outputFields)
          onChange("outputFieldTypes", defaults.outputFieldTypes)
        }
        if (
          (mode === "webhook" || mode === "signal") &&
          !String(values.webhookToken ?? "").trim()
        ) {
          onChange("webhookToken", defaults.webhookToken)
          if (!values.authMode) {
            onChange("authMode", defaults.authMode ?? "none")
          }
        }
      }
    }

    if (field.key === "tableName" && typeof next === "string") {
      const table = findDataTableSummary(dataTables ?? [], next)
      if (table) {
        onChange(
          "columnMappings",
          buildDefaultColumnMappings(
            table.columns,
            asTableColumnMapRows(values.columnMappings)
          )
        )
      }
    }

    if (field.key === "caseCount" || field.key === "includeDefaultOutput") {
      const caseCount = Math.max(
        2,
        Number(field.key === "caseCount" ? next : values.caseCount ?? 2)
      )
      const includeDefault =
        field.key === "includeDefaultOutput"
          ? next === true
          : values.includeDefaultOutput === true

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

    if (field.key === "fieldEdits" && Array.isArray(next)) {
      onChange("fieldCount", next.length)
    }

    if (field.key === "fieldCount") {
      const count = Math.min(
        MAX_EDIT_FIELD_COUNT,
        Math.max(1, Math.floor(Number(next) || 1))
      )
      onChange("fieldCount", count)
      onChange(
        "fieldEdits",
        normalizeFieldEditRows(values.fieldEdits, count)
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
              dataTables={dataTables}
              secrets={secrets}
              onFieldChange={onChange}
              onChange={(next) => handleChange(field, next)}
            />
            {field.description ? (
              <FieldDescription>{field.description}</FieldDescription>
            ) : null}
            {field.type === "table-column-map" &&
            resolveUpstreamFieldOptions(nodes, edges, node.id).length === 0 ? (
              <FieldDescription>
                Connect a previous node to map its output into table columns.
              </FieldDescription>
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
