"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeftIcon,
  PuzzlePieceIcon,
  RocketLaunchIcon,
  ShieldCheckIcon,
  SparkleIcon,
  TrashIcon,
} from "@phosphor-icons/react"

import { DraftSaveStatus } from "@/components/design/draft-save-status"
import { WorkflowTitleEditor } from "@/components/design/workflow-title-editor"
import type { ValidationStatus } from "@/hooks/use-workflow-validation"
import type { DraftSaveStatus as SaveStatus } from "@/hooks/use-workflow-auto-save"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@amakai/shared/components/ui/tooltip"

export interface EditorFloatingChromeProps {
  workflowName: string
  saveStatus: SaveStatus
  saveError?: string | null
  isDeleting: boolean
  actionMessage?: string | null
  deployMessage?: string | null
  validationStatus?: ValidationStatus
  isDeployable?: boolean
  isValidating?: boolean
  onNameChange: (name: string) => void
  onOpenResources: () => void
  onOpenAi: () => void
  onDelete: () => void
  onValidate: () => void
  onDeploy: () => void
}

export function EditorFloatingChrome({
  workflowName,
  saveStatus,
  saveError,
  isDeleting,
  actionMessage,
  deployMessage,
  validationStatus = "idle",
  isDeployable = false,
  isValidating = false,
  onNameChange,
  onOpenResources,
  onOpenAi,
  onDelete,
  onValidate,
  onDeploy,
}: EditorFloatingChromeProps) {
  const message = actionMessage ?? deployMessage

  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-3">
        <div className="pointer-events-auto flex min-w-0 max-w-[min(100%,520px)] flex-col gap-2 rounded-none border bg-background/95 p-2 shadow-sm backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              render={<Link href="/design/workflows" />}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Workflows
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
            <WorkflowTitleEditor
              name={workflowName}
              onNameChange={onNameChange}
            />
            <DraftSaveStatus status={saveStatus} error={saveError} />
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5 rounded-none border bg-background/95 p-1.5 shadow-sm backdrop-blur-sm">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={onOpenResources}
                />
              }
            >
              <PuzzlePieceIcon />
            </TooltipTrigger>
            <TooltipContent side="bottom">Components & templates</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onOpenAi}
                />
              }
            >
              <SparkleIcon data-icon="inline-start" />
              AI
            </TooltipTrigger>
            <TooltipContent side="bottom">AI Builder</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant={
                    validationStatus === "passed"
                      ? "secondary"
                      : validationStatus === "failed"
                        ? "destructive"
                        : "ghost"
                  }
                  size="sm"
                  disabled={isValidating}
                  onClick={onValidate}
                />
              }
            >
              <ShieldCheckIcon data-icon="inline-start" />
              {isValidating
                ? "Validating…"
                : validationStatus === "passed"
                  ? "Validated"
                  : "Validate"}
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {validationStatus === "passed"
                ? "Validation passed — workflow is deployable"
                : validationStatus === "failed"
                  ? "Validation failed — fix errors and re-run"
                  : "Run workflow in playground to validate before deploy"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isDeleting}
                  onClick={onDelete}
                />
              }
            >
              <TrashIcon data-icon="inline-start" />
              {isDeleting ? "Deleting…" : "Delete"}
            </TooltipTrigger>
            <TooltipContent side="bottom">Delete workflow</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="sm"
                  disabled={!isDeployable}
                  onClick={onDeploy}
                />
              }
            >
              <RocketLaunchIcon data-icon="inline-start" />
              Deploy
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {isDeployable
                ? "Deploy validated workflow"
                : "Validate the workflow before deploying"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {message ? (
        <div className="pointer-events-none absolute inset-x-0 top-[7.5rem] z-30 flex justify-center px-3">
          <p className="pointer-events-auto rounded-none border border-destructive/30 bg-background/95 px-3 py-1.5 text-xs text-destructive shadow-sm backdrop-blur-sm">
            {message}
          </p>
        </div>
      ) : null}
    </>
  )
}
