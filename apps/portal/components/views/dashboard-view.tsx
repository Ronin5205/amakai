import Link from "next/link"
import {
  ActivityIcon,
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  ChartLineUpIcon,
  ClockIcon,
  CpuIcon,
  GaugeIcon,
  LightningIcon,
  MagicWandIcon,
  PulseIcon,
  QueueIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react/dist/ssr"

import { DashboardGreetingTitle } from "@/components/views/dashboard-greeting-title"
import { MetricCard } from "@/components/portal/metric-card"
import { MetricGrid } from "@/components/portal/metric-grid"
import { ResourceMeter } from "@/components/portal/resource-meter"
import { StatusBadge } from "@/components/portal/status-badge"
import { SectionPage } from "@/components/section-page"
import type { Execution, ExecutionSummary } from "@/lib/domain/execution"
import type { AiUsage, LatencyMetric } from "@/lib/domain/monitoring"
import { Button } from "@amakai/shared/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@amakai/shared/components/ui/empty"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@amakai/shared/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@amakai/shared/components/ui/table"

export interface DashboardViewProps {
  hasWorkflows: boolean
  workflowCounts: ExecutionSummary
  performanceMetrics: LatencyMetric[]
  aiUsage: AiUsage
  recentExecutions: Execution[]
}

function formatDuration(ms: number) {
  if (ms < 1000) {
    return `${ms}ms`
  }

  const seconds = Math.round(ms / 100) / 10
  return `${seconds}s`
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US")
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

function findMetric(metrics: LatencyMetric[], label: string) {
  return metrics.find((metric) => metric.label === label)
}

function computeAvgRuntime(executions: Execution[]) {
  const durations = executions
    .map((execution) => execution.durationMs)
    .filter((duration): duration is number => duration !== undefined)

  if (durations.length === 0) {
    return 0
  }

  return Math.round(
    durations.reduce((total, duration) => total + duration, 0) / durations.length
  )
}

export function DashboardView({
  hasWorkflows,
  workflowCounts,
  performanceMetrics,
  aiUsage,
  recentExecutions,
}: DashboardViewProps) {
  if (!hasWorkflows) {
    return (
      <SectionPage
        eyebrow="Overview"
        title={<DashboardGreetingTitle />}
        description="Get started by creating your first workflow."
      >
        <Empty className="min-h-[320px] border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MagicWandIcon />
            </EmptyMedia>
            <EmptyTitle>No workflows yet</EmptyTitle>
            <EmptyDescription>
              Create a workflow to automate tasks, monitor executions, and
              track performance across your workspace.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link href="/design/workflows?new=1" />}>
              Create workflow
              <ArrowRightIcon data-icon="inline-end" />
            </Button>
          </EmptyContent>
        </Empty>
      </SectionPage>
    )
  }

  const totalOutcomes = workflowCounts.completed + workflowCounts.failed
  const successRate =
    totalOutcomes > 0
      ? Math.round((workflowCounts.completed / totalOutcomes) * 1000) / 10
      : 0
  const failureRate =
    totalOutcomes > 0
      ? Math.round((workflowCounts.failed / totalOutcomes) * 1000) / 10
      : 0
  const avgRuntime = computeAvgRuntime(recentExecutions)
  const apiLatency = findMetric(performanceMetrics, "API Gateway")?.p50Ms ?? 0
  const aiLatency = findMetric(performanceMetrics, "AI Core (Planning)")?.p50Ms ?? 0

  return (
    <SectionPage
      eyebrow="Overview"
      title={<DashboardGreetingTitle />}
      description="Live workflow activity, performance, and recent executions across your workspace."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <ArrowsClockwiseIcon data-icon="inline-start" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled
            render={<Link href="/operate/executions" />}
          >
            View all
            <ArrowRightIcon data-icon="inline-end" />
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Live workflow counts</h2>
          <MetricGrid className="lg:grid-cols-5">
            <MetricCard
              label="Running"
              value={formatNumber(workflowCounts.running)}
              icon={PulseIcon}
            />
            <MetricCard
              label="Queued"
              value={formatNumber(workflowCounts.queued)}
              icon={QueueIcon}
            />
            <MetricCard
              label="Completed"
              value={formatNumber(workflowCounts.completed)}
              icon={ChartLineUpIcon}
            />
            <MetricCard
              label="Failed"
              value={formatNumber(workflowCounts.failed)}
              icon={WarningCircleIcon}
            />
            <MetricCard
              label="Pending approval"
              value={formatNumber(workflowCounts.pendingApproval)}
              icon={ClockIcon}
            />
          </MetricGrid>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-medium">Performance</h2>
          <MetricGrid className="lg:grid-cols-5">
            <MetricCard
              label="Success rate"
              value={`${successRate}%`}
              hint="Completed vs failed outcomes"
              icon={ActivityIcon}
            />
            <MetricCard
              label="Failure rate"
              value={`${failureRate}%`}
              hint="Failed executions share"
              icon={WarningCircleIcon}
            />
            <MetricCard
              label="Avg runtime"
              value={avgRuntime > 0 ? formatDuration(avgRuntime) : "—"}
              hint="Recent execution average"
              icon={ClockIcon}
            />
            <MetricCard
              label="API latency"
              value={formatDuration(apiLatency)}
              hint="API Gateway p50"
              icon={LightningIcon}
            />
            <MetricCard
              label="AI latency"
              value={formatDuration(aiLatency)}
              hint="AI Core p50"
              icon={CpuIcon}
            />
          </MetricGrid>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GaugeIcon className="size-4" />
                Model utilization
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {Object.entries(aiUsage.modelUtilization).map(([model, percentage]) => (
                <ResourceMeter
                  key={model}
                  label={model}
                  value={percentage}
                  displayValue={`${percentage}%`}
                />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CpuIcon className="size-4" />
                AI usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <MetricGrid className="sm:grid-cols-2">
                <MetricCard
                  label="Prompt tokens"
                  value={formatNumber(aiUsage.promptTokens)}
                />
                <MetricCard
                  label="Completion tokens"
                  value={formatNumber(aiUsage.completionTokens)}
                />
                <MetricCard
                  label="Total requests"
                  value={formatNumber(aiUsage.totalRequests)}
                />
                <MetricCard
                  label="Avg cost / request"
                  value={`$${aiUsage.avgCostUsd.toFixed(3)}`}
                />
              </MetricGrid>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium">Recent executions</h2>
          </div>
          <Card>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Workflow</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Trigger</TableHead>
                    <TableHead>Environment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentExecutions.map((execution) => (
                    <TableRow key={execution.id}>
                      <TableCell className="font-medium">
                        {execution.workflowName}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={execution.status} />
                      </TableCell>
                      <TableCell>{formatTimestamp(execution.startedAt)}</TableCell>
                      <TableCell>
                        {execution.durationMs
                          ? formatDuration(execution.durationMs)
                          : "—"}
                      </TableCell>
                      <TableCell>{execution.trigger}</TableCell>
                      <TableCell>{execution.environment}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </SectionPage>
  )
}
