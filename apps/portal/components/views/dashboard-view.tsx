import { DashboardGreetingTitle } from "@/components/views/dashboard-greeting-title"
import { LiveWorkflowsView } from "@/components/views/live-workflows-view"
import { ProductionHistoryView } from "@/components/views/production-history-view"
import { SectionPage } from "@/components/section-page"
import type { LiveWorkflow } from "@/lib/domain/deployment"
import type { ProductionRun, ProductionRunSummary } from "@/lib/domain/production"
import Link from "next/link"
import { Button } from "@amakai/shared/components/ui/button"

export interface DashboardViewProps {
  liveWorkflows: LiveWorkflow[]
  recentProductionRuns: ProductionRun[]
  productionRunSummary: ProductionRunSummary
}

export function DashboardView({
  liveWorkflows,
  recentProductionRuns,
  productionRunSummary,
}: DashboardViewProps) {
  return (
    <SectionPage
      eyebrow="Overview"
      title={<DashboardGreetingTitle />}
      description="Your production workflows, runs, and recent platform activity."
    >
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium">Production runs</h2>
            <p className="text-sm text-muted-foreground">
              Start manual workflows and review recent run history.
            </p>
          </div>
          <Button size="sm" render={<Link href="/production/runs" />}>
            Run workflow
          </Button>
        </div>
        <ProductionHistoryView
          runs={recentProductionRuns}
          summary={productionRunSummary}
          compact
          viewAllHref="/production/history"
        />
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-medium">Live workflows</h2>
          <p className="text-sm text-muted-foreground">
            Workflows currently deployed to production.
          </p>
        </div>
        <LiveWorkflowsView
          workflows={liveWorkflows}
          compact
          viewAllHref="/operate/live-workflows"
        />
      </section>
    </SectionPage>
  )
}
