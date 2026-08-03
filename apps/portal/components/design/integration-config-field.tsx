"use client"

import * as React from "react"
import Link from "next/link"
import { PlusIcon } from "@phosphor-icons/react"

import type { SecretKind, SecretSummary } from "@/lib/domain/secret"
import { findSecretSummary, secretKindLabel } from "@/lib/domain/secret"
import {
  INTEGRATION_SERVICES,
  getIntegrationProvider,
  listOperationsForNodeKind,
} from "@/lib/integrations/registry"
import type { NodeKind } from "@/lib/domain/workflow"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@amakai/shared/components/ui/select"

export function SecretSelectEditor({
  id,
  value,
  secrets,
  secretKinds,
  onChange,
}: {
  id: string
  value: string
  secrets: SecretSummary[]
  secretKinds?: SecretKind[]
  onChange: (value: string) => void
}) {
  const filtered = React.useMemo(() => {
    if (!secretKinds || secretKinds.length === 0) {
      return secrets
    }
    return secrets.filter((secret) => secretKinds.includes(secret.kind))
  }, [secrets, secretKinds])

  const items = React.useMemo(
    () => [
      { label: "Select a secret…", value: null },
      ...filtered.map((secret) => ({
        label: secret.accountEmail
          ? `${secret.name} (${secret.accountEmail})`
          : `${secret.name} · ${secretKindLabel(secret.kind)}`,
        value: secret.name,
      })),
    ],
    [filtered]
  )

  const selected = findSecretSummary(filtered, value)

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          No matching secrets yet. Connect an account or add a key under
          Resources → Secrets.
        </p>
        <Button
          variant="outline"
          size="sm"
          render={<Link href="/resources/secrets" />}
        >
          <PlusIcon data-icon="inline-start" />
          Manage secrets
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
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
      {selected?.refreshStatus === "expired" ||
      selected?.refreshStatus === "revoked" ? (
        <p className="text-xs text-destructive">
          This credential needs to be reconnected in Resources → Secrets.
        </p>
      ) : null}
    </div>
  )
}

const INTEGRATION_CASCADE_KEYS = new Set([
  "service",
  "provider",
  "operation",
])

export function IntegrationConfigCascade({
  idPrefix,
  nodeKind,
  values,
  onChange,
  onCascadeChange,
}: {
  idPrefix: string
  nodeKind: NodeKind
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  /** Called when service/provider/operation changes so parent can reset dependent keys. */
  onCascadeChange?: (next: {
    service: string
    provider: string
    operation: string
  }) => void
}) {
  const service = typeof values.service === "string" ? values.service : ""
  const provider = typeof values.provider === "string" ? values.provider : ""
  const operation = typeof values.operation === "string" ? values.operation : ""

  const requiredKind = nodeKind === "trigger" ? "trigger" : "sequential"

  const serviceItems = React.useMemo(
    () => [
      { label: "Select a service…", value: null },
      ...INTEGRATION_SERVICES.map((entry) => ({
        label: entry.label,
        value: entry.id,
      })),
    ],
    []
  )

  const providerItems = React.useMemo(() => {
    const svc = INTEGRATION_SERVICES.find((entry) => entry.id === service)
    return [
      { label: "Select a provider…", value: null },
      ...(svc?.providers ?? []).map((entry) => ({
        label: entry.label,
        value: entry.id,
      })),
    ]
  }, [service])

  const operationItems = React.useMemo(() => {
    const ops = listOperationsForNodeKind(service, provider, requiredKind)
    return [
      { label: "Select an operation…", value: null },
      ...ops.map((entry) => ({
        label: entry.label,
        value: entry.id,
      })),
    ]
  }, [service, provider, requiredKind])

  const emitCascade = (next: {
    service: string
    provider: string
    operation: string
  }) => {
    onChange("service", next.service)
    onChange("provider", next.provider)
    onChange("operation", next.operation)
    onCascadeChange?.(next)
  }

  return (
    <div className="flex flex-col gap-3">
      <Select
        items={serviceItems}
        value={service || null}
        onValueChange={(next) => {
          const value = typeof next === "string" ? next : ""
          emitCascade({ service: value, provider: "", operation: "" })
        }}
      >
        <SelectTrigger id={`${idPrefix}-service`} className="w-full">
          <SelectValue placeholder="Service" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} side="bottom">
          <SelectGroup>
            {serviceItems.map((item) => (
              <SelectItem key={item.value ?? "__empty__"} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        items={providerItems}
        value={provider || null}
        onValueChange={(next) => {
          const value = typeof next === "string" ? next : ""
          emitCascade({ service, provider: value, operation: "" })
        }}
        disabled={!service}
      >
        <SelectTrigger id={`${idPrefix}-provider`} className="w-full">
          <SelectValue placeholder="Provider" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} side="bottom">
          <SelectGroup>
            {providerItems.map((item) => (
              <SelectItem key={item.value ?? "__empty__"} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        items={operationItems}
        value={operation || null}
        onValueChange={(next) => {
          const value = typeof next === "string" ? next : ""
          emitCascade({ service, provider, operation: value })
          const op = getIntegrationProvider(service, provider)?.operations.find(
            (entry) => entry.id === value
          )
          if (op?.defaultOutputFields) {
            onChange("outputFieldDefs", op.defaultOutputFields)
            onChange(
              "outputFields",
              op.defaultOutputFields.map((field) => field.name)
            )
            onChange(
              "outputFieldTypes",
              Object.fromEntries(
                op.defaultOutputFields.map((field) => [field.name, field.type])
              )
            )
          }
        }}
        disabled={!provider}
      >
        <SelectTrigger id={`${idPrefix}-operation`} className="w-full">
          <SelectValue placeholder="Operation" />
        </SelectTrigger>
        <SelectContent alignItemWithTrigger={false} side="bottom">
          <SelectGroup>
            {operationItems.map((item) => (
              <SelectItem key={item.value ?? "__empty__"} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}

export { INTEGRATION_CASCADE_KEYS }
