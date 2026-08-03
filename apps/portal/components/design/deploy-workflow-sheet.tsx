"use client"

import * as React from "react"
import { RocketLaunchIcon } from "@phosphor-icons/react"

import { deployWorkflowAction } from "@/lib/actions/workflow-actions"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@amakai/shared/components/ui/sheet"

export interface DeployWorkflowSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string | null
  onDeployed?: (result: { deployedAt: string }) => void
}

export function DeployWorkflowSheet({
  open,
  onOpenChange,
  workflowId,
  onDeployed,
}: DeployWorkflowSheetProps) {
  const [isDeploying, setIsDeploying] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setError(null)
    }
  }, [open])

  const handleDeploy = async () => {
    if (!workflowId) {
      setError("Save the workflow draft before deploying.")
      return
    }

    setIsDeploying(true)
    setError(null)

    const result = await deployWorkflowAction(workflowId)

    setIsDeploying(false)

    if ("error" in result) {
      setError(result.error)
      return
    }

    onDeployed?.(result)
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>Deploy workflow</SheetTitle>
          <SheetDescription>
            Publish the validated draft to production. Redeploying replaces the
            current live version.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <Button
            className="mt-auto w-full"
            disabled={isDeploying || !workflowId}
            onClick={handleDeploy}
          >
            <RocketLaunchIcon data-icon="inline-start" />
            {isDeploying ? "Deploying…" : "Deploy to production"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
