"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { CaretRightIcon } from "@phosphor-icons/react"

import {
  isNavGroupActive,
  isNavItemActive,
  portalNavigation,
  type PortalNavItem,
} from "@/lib/navigation"
import { Logo } from "@amakai/shared/components/logo"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@amakai/shared/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@amakai/shared/components/ui/sidebar"
import { siteConfig } from "@amakai/shared/lib/site-config"
import { cn } from "@amakai/shared/lib/utils"
function NavLinkItem({ item, pathname }: { item: PortalNavItem; pathname: string }) {
  if (!item.href) return null

  const Icon = item.icon
  const active = isNavItemActive(pathname, item.href)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={active}
        tooltip={item.title}
        render={<Link href={item.href} />}
      >
        <Icon />
        <span>{item.title}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function NavGroupItem({ item, pathname }: { item: PortalNavItem; pathname: string }) {
  if (!item.items?.length) return null

  const Icon = item.icon
  const open = isNavGroupActive(pathname, item)

  return (
    <Collapsible defaultOpen={open} className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel
          render={
            <CollapsibleTrigger className="flex w-full items-center gap-2 outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring">
              <Icon />
              <span className="flex-1 text-start">{item.title}</span>
              <CaretRightIcon className="transition-transform duration-200 group-data-open/collapsible:rotate-90 rtl:group-data-open/collapsible:-rotate-90" />
            </CollapsibleTrigger>
          }
        />
        <CollapsibleContent>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuSub>
                {item.items.map((subItem) => {
                  if (!subItem.href) return null

                  const SubIcon = subItem.icon
                  const active = isNavItemActive(pathname, subItem.href)

                  return (
                    <SidebarMenuSubItem key={subItem.href}>
                      <SidebarMenuSubButton
                        isActive={active}
                        render={<Link href={subItem.href} />}
                      >
                        <SubIcon />
                        <span>{subItem.title}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  )
                })}
              </SidebarMenuSub>
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  )
}

function SidebarLogo() {
  const { state } = useSidebar()
  const collapsed = state === "collapsed"

  return (
    <SidebarMenuButton
      size="lg"
      className={cn(
        "hover:bg-transparent active:bg-transparent",
        collapsed && "justify-center"
      )}
      render={
        <Link
          href="/"
          aria-label={`${siteConfig.name} portal home`}
          className="outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring"
        />
      }
    >
      <Logo
        iconOnly={collapsed}
        iconClassName={collapsed ? "size-8" : undefined}
        className={cn(!collapsed && "max-w-[7rem]")}
      />
    </SidebarMenuButton>
  )
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="border-b border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarLogo />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {portalNavigation.map((item) =>
                item.href ? (
                  <NavLinkItem key={item.title} item={item} pathname={pathname} />
                ) : null
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {portalNavigation.map((item) =>
          item.items ? (
            <NavGroupItem key={item.title} item={item} pathname={pathname} />
          ) : null
        )}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
