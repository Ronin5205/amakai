import type { Icon } from "@phosphor-icons/react"
import {
  BookOpenIcon,
  BrainIcon,
  ClockCounterClockwiseIcon,
  CreditCardIcon,
  DotsThreeIcon,
  FlaskIcon,
  GearIcon,
  HouseIcon,
  KeyIcon,
  PlugsConnectedIcon,
  PlayIcon,
  PulseIcon,
  PuzzlePieceIcon,
  RocketLaunchIcon,
  ScrollIcon,
  TableIcon,
  TreeStructureIcon,
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
    title: "Production",
    icon: RocketLaunchIcon,
    items: [
      {
        title: "Runs",
        href: "/production/runs",
        icon: RocketLaunchIcon,
      },
      {
        title: "History",
        href: "/production/history",
        icon: ClockCounterClockwiseIcon,
      },
    ],
  },
  {
    title: "Design",
    icon: TreeStructureIcon,
    items: [
      {
        title: "Workflows",
        href: "/design/workflows",
        icon: TreeStructureIcon,
      },
      {
        title: "Tables",
        href: "/design/tables",
        icon: TableIcon,
      },
      {
        title: "Testing",
        href: "/design/testing",
        icon: FlaskIcon,
      },
    ],
  },
  {
    title: "Operate",
    icon: PlayIcon,
    items: [
      {
        title: "Live Workflows",
        href: "/operate/live-workflows",
        icon: PulseIcon,
      },
      { title: "Logs", href: "/operate/logs", icon: ScrollIcon },
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
      { title: "Billing", href: "/admin/billing", icon: CreditCardIcon },
      { title: "Settings", href: "/settings", icon: GearIcon },
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

  const productionMatch = pathname.match(/^\/production\/([^/]+)/)
  if (productionMatch) {
    const subPage = productionMatch[1]
    const crumbs: BreadcrumbCrumb[] = [{ label: "Production" }]

    if (subPage === "runs") {
      crumbs.push({ label: "Runs", href: "/production/runs" })
    } else if (subPage === "history") {
      crumbs.push({ label: "History", href: "/production/history" })
    } else {
      crumbs.push({
        label: subPage.replace(/-/g, " "),
        href: pathname,
      })
    }

    return crumbs
  }

  const liveWorkflowMatch = pathname.match(
    /^\/operate\/live-workflows\/([^/]+)(?:\/([^/]+))?/
  )
  if (liveWorkflowMatch) {
    const subPage = liveWorkflowMatch[2]
    const crumbs: BreadcrumbCrumb[] = [
      { label: "Operate" },
      { label: "Live Workflows", href: "/operate/live-workflows" },
    ]

    if (subPage === "monitoring") {
      crumbs.push({ label: "Monitoring", href: pathname })
    } else if (subPage === "executions") {
      crumbs.push({ label: "Executions", href: pathname })
    } else {
      crumbs.push({ label: "Workflow", href: pathname })
    }

    return crumbs
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

export function isNavItemActive(
  pathname: string,
  href: string,
  currentSearch = ""
) {
  const [hrefPath, hrefQuery] = href.split("?", 2)

  if (hrefPath === "/") {
    return pathname === "/"
  }

  const pathMatches =
    pathname === hrefPath || pathname.startsWith(`${hrefPath}/`)

  if (!pathMatches) {
    return false
  }

  if (!hrefQuery) {
    if (hrefPath === "/design/workflows") {
      return (
        pathname === "/design/workflows" ||
        pathname.startsWith("/design/workflow-editor")
      )
    }

    if (hrefPath === "/design/tables") {
      return (
        pathname === "/design/tables" ||
        pathname.startsWith("/design/tables/")
      )
    }

    if (hrefPath === "/design/testing") {
      return pathname === "/design/testing"
    }

    if (hrefPath === "/operate/live-workflows") {
      return (
        pathname === "/operate/live-workflows" ||
        pathname.startsWith("/operate/live-workflows/")
      )
    }

    if (hrefPath === "/production/runs") {
      return pathname === "/production/runs"
    }

    if (hrefPath === "/production/history") {
      return pathname === "/production/history"
    }

    return true
  }

  const expected = new URLSearchParams(hrefQuery)
  const current = new URLSearchParams(currentSearch)

  for (const [key, value] of expected.entries()) {
    if (current.get(key) !== value) {
      return false
    }
  }

  return true
}

export function isNavGroupActive(
  pathname: string,
  item: PortalNavItem,
  currentSearch = ""
) {
  return (
    item.items?.some(
      (child) =>
        child.href && isNavItemActive(pathname, child.href, currentSearch)
    ) ?? false
  )
}
