"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  EnvelopeSimpleIcon,
  KeyIcon,
  MicrosoftOutlookLogoIcon,
  PlusIcon,
} from "@phosphor-icons/react"

import {
  createManualSecretAction,
  deleteSecretAction,
  startGmailOAuthAction,
  startOutlookOAuthAction,
  type ManualSecretKind,
} from "@/lib/actions/secret-actions"
import type { Secret } from "@/lib/domain/secret"
import { secretKindLabel } from "@/lib/domain/secret"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@amakai/shared/components/ui/dialog"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@amakai/shared/components/ui/empty"
import { Input } from "@amakai/shared/components/ui/input"
import { Label } from "@amakai/shared/components/ui/label"
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
import { Textarea } from "@amakai/shared/components/ui/textarea"

const MANUAL_KINDS: Array<{ label: string; value: ManualSecretKind }> = [
  { label: "API key", value: "api_key" },
  { label: "Bearer token", value: "bearer_token" },
  { label: "Webhook signing", value: "webhook_signing" },
  { label: "SMTP", value: "smtp" },
]

function formatUpdatedAt(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export interface SecretsViewProps {
  secrets: Secret[]
}

export function SecretsView({ secrets: initialSecrets }: SecretsViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [secrets, setSecrets] = React.useState(initialSecrets)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [isConnectingGmail, setIsConnectingGmail] = React.useState(false)
  const [isConnectingOutlook, setIsConnectingOutlook] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [secretToDelete, setSecretToDelete] = React.useState<Secret | null>(null)

  const [name, setName] = React.useState("")
  const [kind, setKind] = React.useState<ManualSecretKind>("api_key")
  const [value, setValue] = React.useState("")
  const [isCreating, setIsCreating] = React.useState(false)

  React.useEffect(() => {
    setSecrets(initialSecrets)
  }, [initialSecrets])

  React.useEffect(() => {
    const connected = searchParams.get("connected")
    const oauthError = searchParams.get("error")
    if (connected === "gmail") {
      setSuccess("Gmail account connected and saved as a secret.")
    } else if (connected === "outlook") {
      setSuccess("Outlook account connected and saved as a secret.")
    }
    if (oauthError) {
      setError(oauthError)
    }
  }, [searchParams])

  const handleConnectGmail = async () => {
    setError(null)
    setSuccess(null)
    setIsConnectingGmail(true)
    const result = await startGmailOAuthAction()
    setIsConnectingGmail(false)
    if ("error" in result) {
      setError(result.error)
      return
    }
    window.location.href = result.url
  }

  const handleConnectOutlook = async () => {
    setError(null)
    setSuccess(null)
    setIsConnectingOutlook(true)
    const result = await startOutlookOAuthAction()
    setIsConnectingOutlook(false)
    if ("error" in result) {
      setError(result.error)
      return
    }
    window.location.href = result.url
  }

  const handleCreate = async () => {
    setError(null)
    setSuccess(null)
    setIsCreating(true)
    const result = await createManualSecretAction({ name, kind, value })
    setIsCreating(false)

    if ("error" in result) {
      setError(result.error)
      return
    }

    setSecrets((current) => [result.secret, ...current])
    setCreateOpen(false)
    setName("")
    setValue("")
    setKind("api_key")
    setSuccess(`Secret "${result.secret.name}" created.`)
    router.refresh()
  }

  const handleDeleteConfirm = async () => {
    if (!secretToDelete) {
      return
    }
    setError(null)
    setDeletingId(secretToDelete.id)
    const result = await deleteSecretAction(secretToDelete.id)
    setDeletingId(null)

    if ("error" in result) {
      setError(result.error)
      return
    }

    setSecrets((current) =>
      current.filter((item) => item.id !== secretToDelete.id)
    )
    setSecretToDelete(null)
    setSuccess(`Secret "${secretToDelete.name}" deleted.`)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-3">
          <span className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
            Resources
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-2xl font-medium tracking-tight">
              Secrets
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Store API keys and OAuth credentials used by External Tool and API
              nodes. Values are encrypted and never shown after save.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={handleConnectGmail}
            disabled={isConnectingGmail}
          >
            <EnvelopeSimpleIcon data-icon="inline-start" />
            {isConnectingGmail ? "Connecting…" : "Connect Gmail"}
          </Button>
          <Button
            variant="outline"
            onClick={handleConnectOutlook}
            disabled={isConnectingOutlook}
          >
            <MicrosoftOutlookLogoIcon data-icon="inline-start" />
            {isConnectingOutlook ? "Connecting…" : "Connect Outlook"}
          </Button>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add secret
          </Button>
        </div>
      </div>

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          {success}
        </p>
      ) : null}

      {secrets.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <KeyIcon />
            </EmptyMedia>
            <EmptyTitle>No secrets yet</EmptyTitle>
            <EmptyDescription>
              Connect Gmail or Outlook, or add an API key for HTTP Request
              nodes.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" onClick={handleConnectGmail}>
                Connect Gmail
              </Button>
              <Button onClick={() => setCreateOpen(true)}>Add secret</Button>
            </div>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {secrets.map((secret) => (
                <TableRow key={secret.id}>
                  <TableCell className="font-medium">{secret.name}</TableCell>
                  <TableCell>{secretKindLabel(secret.kind)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {secret.accountEmail ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatUpdatedAt(secret.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={deletingId === secret.id}
                      onClick={() => setSecretToDelete(secret)}
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add secret</DialogTitle>
            <DialogDescription>
              Store an API key or signing secret. OAuth accounts use Connect
              Gmail / Outlook instead.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="secret-name">Name</Label>
              <Input
                id="secret-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Stripe production key"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="secret-kind">Kind</Label>
              <Select
                items={MANUAL_KINDS}
                value={kind}
                onValueChange={(next) => {
                  if (typeof next === "string") {
                    setKind(next as ManualSecretKind)
                  }
                }}
              >
                <SelectTrigger id="secret-kind" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {MANUAL_KINDS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="secret-value">Value</Label>
              <Textarea
                id="secret-value"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Paste the secret value…"
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Saving…" : "Save secret"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(secretToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setSecretToDelete(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete secret</DialogTitle>
            <DialogDescription>
              Delete &quot;{secretToDelete?.name}&quot;? Workflows that reference
              this secret will fail until you update them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSecretToDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={Boolean(deletingId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
            >
              {deletingId ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
