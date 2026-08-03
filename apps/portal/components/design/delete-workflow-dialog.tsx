"use client"

import { TrashIcon } from "@phosphor-icons/react"

import { Button } from "@amakai/shared/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@amakai/shared/components/ui/dialog"

export interface DeleteWorkflowDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowName: string
  isDeleting?: boolean
  onConfirm: () => void
}

export function DeleteWorkflowDialog({
  open,
  onOpenChange,
  workflowName,
  isDeleting = false,
  onConfirm,
}: DeleteWorkflowDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isDeleting}>
        <DialogHeader>
          <DialogTitle>Delete workflow?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{workflowName}</span>{" "}
            will be permanently deleted. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isDeleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            <TrashIcon data-icon="inline-start" />
            {isDeleting ? "Deleting…" : "Delete workflow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
