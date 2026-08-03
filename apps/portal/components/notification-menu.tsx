"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { BellIcon } from "@phosphor-icons/react"

import { StatusBadge } from "@/components/portal/status-badge"
import { useReadLogIds } from "@/hooks/use-read-log-ids"
import { listAlertLogGroupsAction } from "@/lib/actions/operate-actions"
import { formatDateTime } from "@/lib/format"
import type { ExecutionLogGroup } from "@/lib/domain/monitoring"
import { Button } from "@amakai/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@amakai/shared/components/ui/dropdown-menu"
import { cn } from "@amakai/shared/lib/utils"

export function NotificationMenu() {
  const router = useRouter()
  const { isRead, markRead, markAllRead } = useReadLogIds()
  const [alertGroups, setAlertGroups] = React.useState<ExecutionLogGroup[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const loadAlerts = React.useCallback(async () => {
    setIsLoading(true)
    const groups = await listAlertLogGroupsAction()
    setAlertGroups(groups)
    setIsLoading(false)
  }, [])

  React.useEffect(() => {
    void loadAlerts()
  }, [loadAlerts])

  React.useEffect(() => {
    const refresh = () => {
      void loadAlerts()
    }

    window.addEventListener("focus", refresh)
    window.addEventListener("amakai-read-logs-changed", refresh)
    return () => {
      window.removeEventListener("focus", refresh)
      window.removeEventListener("amakai-read-logs-changed", refresh)
    }
  }, [loadAlerts])

  const unreadGroups = React.useMemo(
    () => alertGroups.filter((group) => !isRead(group.executionId)),
    [alertGroups, isRead]
  )

  const recentAlerts = React.useMemo(
    () => alertGroups.slice(0, 8),
    [alertGroups]
  )

  const handleOpenGroup = (group: ExecutionLogGroup) => {
    markRead(group.executionId)
    router.push(
      `/operate/logs?filter=alerts&execution=${encodeURIComponent(group.executionId)}`
    )
  }

  const handleMarkAllRead = () => {
    markAllRead(unreadGroups.map((group) => group.executionId))
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={
              unreadGroups.length > 0
                ? `${unreadGroups.length} unread alerts`
                : "Notifications"
            }
            className="relative"
          />
        }
      >
        <BellIcon />
        {unreadGroups.length > 0 ? (
          <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-white">
            {unreadGroups.length > 9 ? "9+" : unreadGroups.length}
          </span>
        ) : null}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center justify-between gap-2">
            <span>Alerts</span>
            {unreadGroups.length > 0 ? (
              <button
                type="button"
                className="text-[11px] font-normal text-muted-foreground transition-colors hover:text-foreground"
                onClick={handleMarkAllRead}
              >
                Mark all read
              </button>
            ) : null}
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        {isLoading ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            Loading alerts…
          </div>
        ) : recentAlerts.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">
            No alert-level logs yet. Warnings and errors from workflow runs
            will appear here.
          </div>
        ) : (
          recentAlerts.map((group) => {
            const unread = !isRead(group.executionId)

            return (
              <DropdownMenuItem
                key={group.executionId}
                className={cn(
                  "flex cursor-pointer flex-col items-start gap-1 py-2",
                  unread && "bg-destructive/5"
                )}
                onClick={() => handleOpenGroup(group)}
              >
                <div className="flex w-full items-center gap-2">
                  <StatusBadge status={group.level} />
                  <span className="truncate text-xs font-medium">
                    {group.message}
                  </span>
                  {unread ? (
                    <span className="ms-auto size-2 shrink-0 rounded-full bg-destructive" />
                  ) : null}
                </div>
                <span className="line-clamp-2 text-xs text-muted-foreground">
                  {group.workflowName} · {group.logCount} log entries
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {formatDateTime(group.startedAt)}
                </span>
              </DropdownMenuItem>
            )
          })
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href="/operate/logs?filter=alerts" />}>
          View all logs
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
