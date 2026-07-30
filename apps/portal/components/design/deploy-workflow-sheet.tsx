"use client"

import * as React from "react"
import { RocketLaunchIcon } from "@phosphor-icons/react"

import { deployWorkflowAction } from "@/lib/actions/workflow-actions"
import type { Environment } from "@/lib/domain/deployment"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@amakai/shared/components/ui/sheet"
import { StatusBadge } from "@/components/portal/status-badge"

export interface DeployWorkflowSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workflowId: string | null
  environments: Environment[]
  onDeployed?: (result: { version: string; environment: string }) => void
}

export function DeployWorkflowSheet({
  open,
  onOpenChange,
  workflowId,
  environments,
  onDeployed,
}: DeployWorkflowSheetProps) {
  const [selectedEnvironmentId, setSelectedEnvironmentId] = React.useState<
    string | null
  >(environments[0]?.id ?? null)
  const [isDeploying, setIsDeploying] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setSelectedEnvironmentId(environments[0]?.id ?? null)
      setError(null)
    }
  }, [environments, open])

  const handleDeploy = async () => {
    if (!workflowId || !selectedEnvironmentId) {
      setError("Save the workflow draft before deploying.")
      return
    }

    setIsDeploying(true)
    setError(null)

    const result = await deployWorkflowAction(workflowId, selectedEnvironmentId)

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
            Choose an environment to publish the current draft as an immutable
            version.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">
          {environments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No environments available yet.
            </p>
          ) : (
            <div className="space-y-2">
              {environments.map((environment) => {
                const isSelected = selectedEnvironmentId === environment.id

                return (
                  <button
                    key={environment.id}
                    type="button"
                    onClick={() => setSelectedEnvironmentId(environment.id)}
                    className={`flex w-full items-start justify-between gap-3 border p-3 text-left transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium">{environment.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Current version: {environment.deployedVersion}
                      </p>
                    </div>
                    <StatusBadge
                      status={environment.kind}
                      label={environment.kind}
                    />
                  </button>
                )
              })}
            </div>
          )}

          {error ? (
            <p className="text-sm text-destructive">{error}</p>
          ) : null}

          <Button
            className="mt-auto w-full"
            disabled={!selectedEnvironmentId || isDeploying || !workflowId}
            onClick={handleDeploy}
          >
            <RocketLaunchIcon data-icon="inline-start" />
            {isDeploying ? "Deploying…" : "Deploy to environment"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
