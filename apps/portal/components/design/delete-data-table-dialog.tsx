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

export interface DeleteDataTableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tableName: string
  isDeleting?: boolean
  onConfirm: () => void
}

export function DeleteDataTableDialog({
  open,
  onOpenChange,
  tableName,
  isDeleting = false,
  onConfirm,
}: DeleteDataTableDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isDeleting}>
        <DialogHeader>
          <DialogTitle>Delete table?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{tableName}</span> and
            all of its rows will be permanently deleted. Workflows that reference
            this table will need to be updated.
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
            {isDeleting ? "Deleting…" : "Delete table"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
