"use client"

import { CopyIcon, DotsThreeIcon, TrashIcon } from "@phosphor-icons/react"

import { Button } from "@amakai/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@amakai/shared/components/ui/dropdown-menu"

export interface ResourceRowActionsMenuProps {
  onDuplicate: () => void
  onDelete: () => void
  isDuplicating?: boolean
  isDeleting?: boolean
  duplicateDisabled?: boolean
  disabled?: boolean
}

export function ResourceRowActionsMenu({
  onDuplicate,
  onDelete,
  isDuplicating = false,
  isDeleting = false,
  duplicateDisabled = false,
  disabled = false,
}: ResourceRowActionsMenuProps) {
  const isBusy = isDuplicating || isDeleting

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="icon-sm"
            aria-label="More options"
            disabled={disabled || isBusy}
          />
        }
      >
        <DotsThreeIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={isBusy || duplicateDisabled}
          onClick={onDuplicate}
        >
          <CopyIcon />
          {isDuplicating ? "Duplicating…" : "Duplicate"}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          disabled={isBusy}
          onClick={onDelete}
        >
          <TrashIcon />
          {isDeleting ? "Deleting…" : "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
