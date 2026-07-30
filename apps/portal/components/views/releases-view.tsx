import { StatusBadge } from "@/components/portal/status-badge"
import { formatDateTime } from "@/lib/format"
import type { Release } from "@/lib/domain/deployment"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amakai/shared/components/ui/table"

export interface ReleasesViewProps {
  releases: Release[]
}

export function ReleasesView({ releases }: ReleasesViewProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Environment</TableHead>
          <TableHead>Version</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Deployed</TableHead>
          <TableHead>Deployed by</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {releases.map((release) => (
          <TableRow key={release.id}>
            <TableCell className="font-medium capitalize">
              {release.environment}
            </TableCell>
            <TableCell>{release.version}</TableCell>
            <TableCell>
              <StatusBadge status={release.status} />
            </TableCell>
            <TableCell className="text-muted-foreground">
              {formatDateTime(release.deployedAt)}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {release.deployedBy}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
