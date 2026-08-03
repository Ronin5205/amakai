"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  DatabaseIcon,
  KeyIcon,
  TreeStructureIcon,
  UserCircleIcon,
} from "@phosphor-icons/react"

import { ConfirmDestructiveDialog } from "@/components/settings/confirm-destructive-dialog"
import { ThemePreferencePicker } from "@/components/settings/theme-preference-picker"
import { usePortalSession } from "@/hooks/use-portal-session"
import {
  deleteAccountAction,
  deleteAllDataTablesAction,
  deleteAllSecretsAction,
  deleteAllUserDataAction,
  deleteAllWorkflowsAction,
} from "@/lib/actions/settings-actions"
import { portalRoutes } from "@/lib/content"
import { formatDateTime } from "@/lib/format"
import type { UserProfileSummary } from "@/lib/domain/settings"
import { getUsernameInitials } from "@/lib/auth/user"
import {
  Avatar,
  AvatarFallback,
} from "@amakai/shared/components/ui/avatar"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@amakai/shared/components/ui/card"
import { Separator } from "@amakai/shared/components/ui/separator"

type DestructiveAction =
  | "workflows"
  | "tables"
  | "secrets"
  | "all-data"
  | "account"
  | null

export interface SettingsViewProps {
  profile: UserProfileSummary
}

function ProfileField({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

export function SettingsView({ profile: initialProfile }: SettingsViewProps) {
  const router = useRouter()
  const { signOut } = usePortalSession()
  const [profile, setProfile] = React.useState(initialProfile)
  const [error, setError] = React.useState<string | null>(null)
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null)
  const [activeAction, setActiveAction] = React.useState<DestructiveAction>(null)
  const [isConfirming, setIsConfirming] = React.useState(false)

  React.useEffect(() => {
    setProfile(initialProfile)
  }, [initialProfile])

  const initials = profile.username
    ? getUsernameInitials(profile.username)
    : profile.email.slice(0, 2).toUpperCase()

  const closeDialog = () => {
    if (!isConfirming) {
      setActiveAction(null)
    }
  }

  const handleDeleteWorkflows = async () => {
    setIsConfirming(true)
    setError(null)
    setSuccessMessage(null)

    const result = await deleteAllWorkflowsAction()

    setIsConfirming(false)

    if ("error" in result) {
      setError(result.error)
      return
    }

    setProfile((current) => ({ ...current, workflowCount: 0 }))
    setActiveAction(null)
    setSuccessMessage(
      result.deletedCount
        ? `Deleted ${result.deletedCount} workflow${result.deletedCount === 1 ? "" : "s"}.`
        : "No workflows to delete."
    )
    router.refresh()
  }

  const handleDeleteTables = async () => {
    setIsConfirming(true)
    setError(null)
    setSuccessMessage(null)

    const result = await deleteAllDataTablesAction()

    setIsConfirming(false)

    if ("error" in result) {
      setError(result.error)
      return
    }

    setProfile((current) => ({ ...current, tableCount: 0 }))
    setActiveAction(null)
    setSuccessMessage(
      result.deletedCount
        ? `Deleted ${result.deletedCount} table${result.deletedCount === 1 ? "" : "s"}.`
        : "No tables to delete."
    )
    router.refresh()
  }

  const handleDeleteSecrets = async () => {
    setIsConfirming(true)
    setError(null)
    setSuccessMessage(null)

    const result = await deleteAllSecretsAction()

    setIsConfirming(false)

    if ("error" in result) {
      setError(result.error)
      return
    }

    setProfile((current) => ({ ...current, secretCount: 0 }))
    setActiveAction(null)
    setSuccessMessage(
      result.deletedCount
        ? `Deleted ${result.deletedCount} secret${result.deletedCount === 1 ? "" : "s"}.`
        : "No secrets to delete."
    )
    router.refresh()
  }

  const handleDeleteAllData = async () => {
    setIsConfirming(true)
    setError(null)
    setSuccessMessage(null)

    const result = await deleteAllUserDataAction()

    setIsConfirming(false)

    if ("error" in result) {
      setError(result.error)
      return
    }

    setProfile((current) => ({ ...current, workflowCount: 0, tableCount: 0 }))
    setActiveAction(null)
    setSuccessMessage("Deleted all workflows and tables.")
    router.refresh()
  }

  const handleDeleteAccount = async () => {
    setIsConfirming(true)
    setError(null)
    setSuccessMessage(null)

    const result = await deleteAccountAction()

    setIsConfirming(false)

    if ("error" in result) {
      setError(result.error)
      return
    }

    await signOut()
    router.push(portalRoutes.signIn)
    router.refresh()
  }

  return (
    <div className="flex w-full flex-col gap-8">
      {error ? (
        <p className="rounded-none border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-none border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
          {successMessage}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircleIcon className="size-4" />
            Profile
          </CardTitle>
          <CardDescription>
            Basic account information from your sign-in provider.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex flex-col gap-0.5">
              <span className="truncate font-medium">
                {profile.displayName ??
                  (profile.username ? `@${profile.username}` : "Account")}
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {profile.email}
              </span>
            </div>
          </div>

          <Separator />

          <dl className="flex flex-col gap-3 text-sm">
            <ProfileField
              label="Username"
              value={profile.username ? `@${profile.username}` : "—"}
            />
            <ProfileField label="Email" value={profile.email || "—"} />
            <ProfileField
              label="Display name"
              value={profile.displayName ?? "—"}
            />
            <ProfileField
              label="Member since"
              value={formatDateTime(profile.createdAt)}
            />
            <ProfileField
              label="Workflows"
              value={profile.workflowCount.toString()}
            />
            <ProfileField label="Tables" value={profile.tableCount.toString()} />
            <ProfileField label="Secrets" value={profile.secretCount.toString()} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose how Amakai looks on this device. System follows your OS
            setting.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemePreferencePicker className="justify-center sm:justify-start" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data management</CardTitle>
          <CardDescription>
            Permanently remove design data from your account. Production history
            tied to deleted workflows is removed as well.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                <TreeStructureIcon className="size-4" />
                Workflows
              </span>
              <span className="text-sm text-muted-foreground">
                Delete all {profile.workflowCount} workflow
                {profile.workflowCount === 1 ? "" : "s"} and their deployed
                versions.
              </span>
            </div>
            <Button
              variant="outline"
              disabled={profile.workflowCount === 0 || isConfirming}
              className="w-full shrink-0 sm:w-auto"
              onClick={() => setActiveAction("workflows")}
            >
              Delete all workflows
            </Button>
          </div>

          <div className="flex flex-col gap-4 border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                <DatabaseIcon className="size-4" />
                Tables
              </span>
              <span className="text-sm text-muted-foreground">
                Delete all {profile.tableCount} data table
                {profile.tableCount === 1 ? "" : "s"} and their rows.
              </span>
            </div>
            <Button
              variant="outline"
              disabled={profile.tableCount === 0 || isConfirming}
              className="w-full shrink-0 sm:w-auto"
              onClick={() => setActiveAction("tables")}
            >
              Delete all tables
            </Button>
          </div>

          <div className="flex flex-col gap-4 border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                <KeyIcon className="size-4" />
                Secrets
              </span>
              <span className="text-sm text-muted-foreground">
                Delete all {profile.secretCount} stored secret
                {profile.secretCount === 1 ? "" : "s"}, including API keys and
                connected OAuth accounts.
              </span>
            </div>
            <Button
              variant="outline"
              disabled={profile.secretCount === 0 || isConfirming}
              className="w-full shrink-0 sm:w-auto"
              onClick={() => setActiveAction("secrets")}
            >
              Delete all secrets
            </Button>
          </div>

          <div className="flex flex-col gap-4 border border-destructive/30 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-sm font-medium">Delete all user data</span>
              <span className="text-sm text-muted-foreground">
                Remove every workflow and table in one step. Your account stays
                active.
              </span>
            </div>
            <Button
              variant="outline"
              disabled={
                (profile.workflowCount === 0 && profile.tableCount === 0) ||
                isConfirming
              }
              className="w-full shrink-0 sm:w-auto"
              onClick={() => setActiveAction("all-data")}
            >
              Delete all data
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger zone</CardTitle>
          <CardDescription>
            Permanently delete your account and all associated data. This cannot
            be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center sm:justify-start">
          <Button
            variant="outline"
            disabled={isConfirming}
            className="w-full border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive sm:w-auto"
            onClick={() => setActiveAction("account")}
          >
            Delete account
          </Button>
        </CardContent>
      </Card>

      <ConfirmDestructiveDialog
        open={activeAction === "workflows"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        title="Delete all workflows?"
        description={
          <>
            This permanently deletes all {profile.workflowCount} workflow
            {profile.workflowCount === 1 ? "" : "s"}, including deployed
            versions and run history.
          </>
        }
        confirmLabel="Delete all workflows"
        isConfirming={isConfirming}
        onConfirm={handleDeleteWorkflows}
      />

      <ConfirmDestructiveDialog
        open={activeAction === "tables"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        title="Delete all tables?"
        description={
          <>
            This permanently deletes all {profile.tableCount} data table
            {profile.tableCount === 1 ? "" : "s"} and every row they contain.
          </>
        }
        confirmLabel="Delete all tables"
        isConfirming={isConfirming}
        onConfirm={handleDeleteTables}
      />

      <ConfirmDestructiveDialog
        open={activeAction === "secrets"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        title="Delete all secrets?"
        description={
          <>
            This permanently deletes all {profile.secretCount} secret
            {profile.secretCount === 1 ? "" : "s"}, including API keys, bearer
            tokens, webhook signing keys, and connected Gmail or Outlook
            accounts. Workflows that reference these secrets will stop working.
          </>
        }
        confirmLabel="Delete all secrets"
        isConfirming={isConfirming}
        onConfirm={handleDeleteSecrets}
      />

      <ConfirmDestructiveDialog
        open={activeAction === "all-data"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        title="Delete all user data?"
        description={
          <>
            This permanently deletes all workflows, deployed versions, run
            history, and data tables. Your account will remain signed in.
          </>
        }
        confirmLabel="Delete all data"
        isConfirming={isConfirming}
        onConfirm={handleDeleteAllData}
      />

      <ConfirmDestructiveDialog
        open={activeAction === "account"}
        onOpenChange={(open) => {
          if (!open) closeDialog()
        }}
        title="Delete account?"
        description={
          <>
            This permanently deletes your account, all workflows, tables, and
            production history. You will be signed out immediately.
          </>
        }
        confirmLabel="Delete account"
        isConfirming={isConfirming}
        requireConfirmationText="DELETE"
        onConfirm={handleDeleteAccount}
      />
    </div>
  )
}
