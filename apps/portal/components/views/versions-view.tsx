import { CopyIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr"

import { formatDateTime } from "@/lib/format"
import type { WorkflowVersion } from "@/lib/domain/deployment"
import { Badge } from "@amakai/shared/components/ui/badge"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amakai/shared/components/ui/table"

export interface VersionsViewProps {
  versions: WorkflowVersion[]
}

export function VersionsView({ versions }: VersionsViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Version</TableHead>
          <TableHead>Workflow</TableHead>
          <TableHead>Author</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-end">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {versions.map((version) => (
          <TableRow key={version.id}>
            <TableCell className="font-medium">
              <div className="flex flex-wrap items-center gap-2">
                {version.version}
                {version.isCurrent ? (
                  <Badge variant="outline">Current</Badge>
                ) : null}
              </div>
            </TableCell>
            <TableCell>{version.workflowName}</TableCell>
            <TableCell className="text-muted-foreground">
              {version.author}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDateTime(version.createdAt)}
            </TableCell>
            <TableCell>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" disabled>
                  <ArrowCounterClockwiseIcon data-icon="inline-start" />
                  Rollback
                </Button>
                <Button variant="outline" size="sm" disabled>
                  <CopyIcon data-icon="inline-start" />
                  Clone
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
