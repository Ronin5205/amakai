"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  MagicWandIcon,
  PlusIcon,
  TreeStructureIcon,
} from "@phosphor-icons/react"

import { DeleteWorkflowDialog } from "@/components/design/delete-workflow-dialog"
import { ResourceRowActionsMenu } from "@/components/design/resource-row-actions-menu"
import { StatusBadge } from "@/components/portal/status-badge"
import {
  createWorkflowAction,
  deleteWorkflowAction,
  duplicateWorkflowAction,
} from "@/lib/actions/workflow-actions"
import type { WorkflowLimitState } from "@/lib/data/workflow-limits"
import type { Workflow } from "@/lib/domain/workflow"
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

export interface WorkflowsViewProps {
  workflows: Workflow[]
  workflowLimit?: WorkflowLimitState | null
  limitError?: string | null
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

export function WorkflowsView({
  workflows: initialWorkflows,
  workflowLimit = null,
  limitError = null,
}: WorkflowsViewProps) {
  const router = useRouter()
  const [workflows, setWorkflows] = React.useState(initialWorkflows)
  const [isCreating, setIsCreating] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [duplicatingId, setDuplicatingId] = React.useState<string | null>(null)
  const [workflowToDelete, setWorkflowToDelete] = React.useState<Workflow | null>(
    null
  )
  const [error, setError] = React.useState<string | null>(limitError)
  const atWorkflowLimit = workflowLimit ? !workflowLimit.canCreate : false

  React.useEffect(() => {
    setWorkflows(initialWorkflows)
  }, [initialWorkflows])

  React.useEffect(() => {
    setError(limitError)
  }, [limitError])

  const handleCreate = async () => {
    setError(null)
    setIsCreating(true)

    const result = await createWorkflowAction()

    setIsCreating(false)

    if ("error" in result) {
      setError(result.error)
      return
    }

    router.push(`/design/workflow-editor?id=${result.workflow.id}`)
  }

  const handleDuplicate = async (workflow: Workflow) => {
    setError(null)
    setDuplicatingId(workflow.id)

    const result = await duplicateWorkflowAction(workflow.id)

    setDuplicatingId(null)

    if ("error" in result) {
      setError(result.error)
      return
    }

    setWorkflows((current) => [result.workflow, ...current])
  }

  const handleDeleteConfirm = async () => {
    if (!workflowToDelete) {
      return
    }

    setError(null)
    setDeletingId(workflowToDelete.id)

    const result = await deleteWorkflowAction(workflowToDelete.id)

    setDeletingId(null)

    if ("error" in result) {
      setError(result.error)
      return
    }

    setWorkflows((current) =>
      current.filter((item) => item.id !== workflowToDelete.id)
    )
    setWorkflowToDelete(null)
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
              Workflows
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Select a workflow to open the editor, or create a new one. Each
              workflow is saved automatically while you design.
            </p>
          </div>
        </div>

        <Button onClick={handleCreate} disabled={isCreating || atWorkflowLimit}>
          <PlusIcon data-icon="inline-start" />
          {isCreating ? "Creating…" : "New workflow"}
        </Button>
      </div>

      {workflowLimit ? (
        <p className="text-xs text-muted-foreground">
          {workflowLimit.count} of {workflowLimit.limit} workflows used.
          {atWorkflowLimit
            ? " Delete an existing workflow to create a new one."
            : null}
        </p>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {workflows.length === 0 ? (
        <Empty className="min-h-[320px] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MagicWandIcon />
            </EmptyMedia>
            <EmptyTitle>No workflows yet</EmptyTitle>
            <EmptyDescription>
              Create your first workflow to start designing automations on the
              canvas.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={handleCreate} disabled={isCreating || atWorkflowLimit}>
              <PlusIcon data-icon="inline-start" />
              Create workflow
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Nodes</TableHead>
                <TableHead>Last updated</TableHead>
                <TableHead className="w-[140px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((workflow) => (
                <TableRow key={workflow.id}>
                  <TableCell className="font-medium">{workflow.name}</TableCell>
                  <TableCell>
                    <StatusBadge
                      status={workflow.status ?? "draft"}
                      label={workflow.status ?? "draft"}
                    />
                  </TableCell>
                  <TableCell>{workflow.nodes.length}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatUpdatedAt(workflow.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        render={
                          <Link
                            href={`/design/workflow-editor?id=${workflow.id}`}
                          />
                        }
                      >
                        <TreeStructureIcon data-icon="inline-start" />
                        Open
                      </Button>
                      <ResourceRowActionsMenu
                        isDuplicating={duplicatingId === workflow.id}
                        isDeleting={deletingId === workflow.id}
                        duplicateDisabled={atWorkflowLimit}
                        onDuplicate={() => handleDuplicate(workflow)}
                        onDelete={() => setWorkflowToDelete(workflow)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {workflows.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Tip: open a workflow to rename it, edit the canvas, and deploy when
          ready. Workflow names must be unique.
        </p>
      ) : null}

      <DeleteWorkflowDialog
        open={workflowToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletingId) {
            setWorkflowToDelete(null)
          }
        }}
        workflowName={workflowToDelete?.name ?? "Workflow"}
        isDeleting={workflowToDelete !== null && deletingId === workflowToDelete.id}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
