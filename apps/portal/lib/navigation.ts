import type { Icon } from "@phosphor-icons/react"
import {
  BellIcon,
  BookOpenIcon,
  BrainIcon,
  ChartLineUpIcon,
  ClockCounterClockwiseIcon,
  CodeIcon,
  CreditCardIcon,
  CubeIcon,
  CurrencyCircleDollarIcon,
  DotsThreeIcon,
  FlowArrowIcon,
  GaugeIcon,
  GearIcon,
  HouseIcon,
  KeyIcon,
  LightningIcon,
  ListChecksIcon,
  MagicWandIcon,
  PackageIcon,
  PlugsConnectedIcon,
  PlayIcon,
  PuzzlePieceIcon,
  RocketLaunchIcon,
  ScrollIcon,
  SparkleIcon,
  StackIcon,
  TagIcon,
  TreeStructureIcon,
  UsersIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react"

export type PortalNavItem = {
  title: string
  href?: string
  icon: Icon
  items?: PortalNavItem[]
}

export type UserMenuAction = {
  label: string
  href: string
  icon: Icon
  disabled?: boolean
}

export const portalNavigation: PortalNavItem[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: HouseIcon,
  },
  {
    title: "Design",
    icon: MagicWandIcon,
    items: [
      { title: "AI Builder", href: "/design/ai-builder", icon: SparkleIcon },
      {
        title: "Workflow Editor",
        href: "/design/workflow-editor",
        icon: TreeStructureIcon,
      },
      { title: "Templates", href: "/design/templates", icon: StackIcon },
    ],
  },
  {
    title: "Deploy",
    icon: RocketLaunchIcon,
    items: [
      {
        title: "Environments",
        href: "/deploy/environments",
        icon: CubeIcon,
      },
      { title: "Versions", href: "/deploy/versions", icon: TagIcon },
      { title: "Releases", href: "/deploy/releases", icon: PackageIcon },
    ],
  },
  {
    title: "Operate",
    icon: PlayIcon,
    items: [
      {
        title: "Executions",
        href: "/operate/executions",
        icon: FlowArrowIcon,
      },
      {
        title: "Monitoring",
        href: "/operate/monitoring",
        icon: GaugeIcon,
      },
      { title: "Logs", href: "/operate/logs", icon: ScrollIcon },
      { title: "Alerts", href: "/operate/alerts", icon: BellIcon },
    ],
  },
  {
    title: "Optimize",
    icon: ChartLineUpIcon,
    items: [
      {
        title: "Analytics",
        href: "/optimize/analytics",
        icon: ChartLineUpIcon,
      },
      {
        title: "AI Recommendations",
        href: "/optimize/ai-recommendations",
        icon: LightningIcon,
      },
      {
        title: "Cost Optimization",
        href: "/optimize/cost-optimization",
        icon: CurrencyCircleDollarIcon,
      },
      {
        title: "Performance",
        href: "/optimize/performance",
        icon: GaugeIcon,
      },
    ],
  },
  {
    title: "Resources",
    icon: PuzzlePieceIcon,
    items: [
      {
        title: "Components",
        href: "/resources/components",
        icon: PuzzlePieceIcon,
      },
      {
        title: "Integrations",
        href: "/resources/integrations",
        icon: PlugsConnectedIcon,
      },
      {
        title: "AI Models",
        href: "/resources/ai-models",
        icon: BrainIcon,
      },
      {
        title: "Knowledge Base",
        href: "/resources/knowledge-base",
        icon: BookOpenIcon,
      },
      { title: "Secrets", href: "/resources/secrets", icon: KeyIcon },
    ],
  },
  {
    title: "Community",
    href: "/community",
    icon: UsersThreeIcon,
  },
  {
    title: "Administration",
    icon: GearIcon,
    items: [
      {
        title: "Organization",
        href: "/admin/organization",
        icon: UsersIcon,
      },
      {
        title: "Users & Roles",
        href: "/admin/users-roles",
        icon: ListChecksIcon,
      },
      { title: "Billing", href: "/admin/billing", icon: CreditCardIcon },
      { title: "API & SDK", href: "/admin/api-sdk", icon: CodeIcon },
      {
        title: "Audit Logs",
        href: "/admin/audit-logs",
        icon: ClockCounterClockwiseIcon,
      },
    ],
  },
]

export const userMenuActions = {
  settings: {
    label: "Settings",
    href: "/settings",
    icon: GearIcon,
  },
  extras: {
    label: "Extras",
    href: "#",
    icon: DotsThreeIcon,
    disabled: true,
  },
} satisfies Record<string, UserMenuAction>

export const themeMenuOptions = [
  { value: "light" as const, label: "Light" },
  { value: "dark" as const, label: "Dark" },
  { value: "system" as const, label: "System" },
]

/** Flat list of every routable nav item for breadcrumbs and lookups. */
export function flattenPortalNavigation(
  items: PortalNavItem[] = portalNavigation
): PortalNavItem[] {
  return items.flatMap((item) =>
    item.href
      ? [item]
      : item.items
        ? flattenPortalNavigation(item.items)
        : []
  )
}

export function getNavItemByHref(href: string): PortalNavItem | undefined {
  return flattenPortalNavigation().find((item) => item.href === href)
}

export type BreadcrumbCrumb = {
  label: string
  href?: string
}

export function getBreadcrumbs(pathname: string): BreadcrumbCrumb[] {
  if (pathname === "/") {
    return [{ label: "Dashboard", href: "/" }]
  }

  if (pathname === "/settings") {
    return [{ label: "Settings", href: "/settings" }]
  }

  const item = getNavItemByHref(pathname)
  if (!item) {
    const label =
      pathname.split("/").pop()?.replace(/-/g, " ") ?? "Page"
    return [{ label, href: pathname }]
  }

  const parent = portalNavigation.find((nav) =>
    nav.items?.some((child) => child.href === pathname)
  )

  if (parent) {
    return [{ label: parent.title }, { label: item.title, href: pathname }]
  }

  return [{ label: item.title, href: pathname }]
}

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function isNavGroupActive(pathname: string, item: PortalNavItem) {
  return (
    item.items?.some(
      (child) => child.href && isNavItemActive(pathname, child.href)
    ) ?? false
  )
}
