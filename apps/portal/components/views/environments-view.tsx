import { StatusBadge } from "@/components/portal/status-badge"
import type { Environment } from "@/lib/domain/deployment"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@amakai/shared/components/ui/card"

export interface EnvironmentsViewProps {
  environments: Environment[]
}

export function EnvironmentsView({ environments }: EnvironmentsViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {environments.map((environment) => (
        <Card key={environment.id}>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center gap-2">
              {environment.name}
              <StatusBadge status={environment.kind} />
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Status</span>
              <StatusBadge status={environment.status} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">
                Deployed version
              </span>
              <span className="font-medium">{environment.deployedVersion}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Health</span>
              <StatusBadge status={environment.health} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Workflows</span>
              <span className="font-medium">{environment.workflowCount}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
