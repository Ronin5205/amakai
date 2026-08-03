"use client"

import * as React from "react"
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
import { Input } from "@amakai/shared/components/ui/input"
import { Label } from "@amakai/shared/components/ui/label"

export interface ConfirmDestructiveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel: string
  isConfirming?: boolean
  requireConfirmationText?: string
  onConfirm: () => void
}

export function ConfirmDestructiveDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  isConfirming = false,
  requireConfirmationText,
  onConfirm,
}: ConfirmDestructiveDialogProps) {
  const [confirmationText, setConfirmationText] = React.useState("")

  React.useEffect(() => {
    if (open) {
      setConfirmationText("")
    }
  }, [open])

  const confirmationMatches =
    !requireConfirmationText ||
    confirmationText.trim() === requireConfirmationText

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isConfirming}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {requireConfirmationText ? (
          <div className="flex flex-col gap-2 px-4">
            <Label htmlFor="destructive-confirmation">
              Type{" "}
              <span className="font-medium text-foreground">
                {requireConfirmationText}
              </span>{" "}
              to confirm
            </Label>
            <Input
              id="destructive-confirmation"
              value={confirmationText}
              onChange={(event) => setConfirmationText(event.target.value)}
              disabled={isConfirming}
              autoComplete="off"
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isConfirming}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isConfirming || !confirmationMatches}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={onConfirm}
          >
            <TrashIcon data-icon="inline-start" />
            {isConfirming ? "Working…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
