"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { AssistantTrigger } from "@/components/ai/assistant-trigger"
import { NotificationMenu } from "@/components/notification-menu"
import { UserMenu } from "@/components/user-menu"
import { getBreadcrumbs } from "@/lib/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@amakai/shared/components/ui/breadcrumb"
import { Separator } from "@amakai/shared/components/ui/separator"
import { SidebarTrigger } from "@amakai/shared/components/ui/sidebar"
import { cn } from "@amakai/shared/lib/utils"

export function PortalHeader() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = React.useState(false)
  const breadcrumbs = getBreadcrumbs(pathname)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)

    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-4 transition-colors duration-200 md:px-6",
        scrolled
          ? "border-border bg-background/85 backdrop-blur-sm"
          : "border-transparent bg-background"
      )}
    >
      <SidebarTrigger />
      <Separator orientation="vertical" className="me-2 h-4" />

      <Breadcrumb className="min-w-0 flex-1">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1

            return (
              <React.Fragment key={`${crumb.label}-${index}`}>
                {index > 0 ? <BreadcrumbSeparator /> : null}
                <BreadcrumbItem className="min-w-0">
                  {isLast || !crumb.href ? (
                    <BreadcrumbPage
                      className={cn(
                        "truncate capitalize",
                        !isLast && "font-normal text-muted-foreground"
                      )}
                    >
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      render={<Link href={crumb.href} />}
                      className="truncate capitalize"
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex shrink-0 items-center gap-1">
        <AssistantTrigger />
        <NotificationMenu />
        <UserMenu />
      </div>
    </header>
  )
}
