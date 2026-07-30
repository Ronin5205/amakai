"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  DesktopIcon,
  MoonIcon,
  SignInIcon,
  SignOutIcon,
  SunIcon,
} from "@phosphor-icons/react"

import { usePortalSession } from "@/hooks/use-portal-session"
import { portalRoutes } from "@/lib/content"
import {
  themeMenuOptions,
  userMenuActions,
} from "@/lib/navigation"
import {
  Avatar,
  AvatarFallback,
} from "@amakai/shared/components/ui/avatar"
import { Button } from "@amakai/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@amakai/shared/components/ui/dropdown-menu"
import {
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from "@amakai/shared/lib/theme"

const themeIcons = {
  light: SunIcon,
  dark: MoonIcon,
  system: DesktopIcon,
} as const

export function UserMenu() {
  const router = useRouter()
  const { user, isSignedIn, isLoading, signOut } = usePortalSession()
  const [preference, setPreference] = React.useState<ThemePreference>(
    getThemePreference
  )

  const SettingsIcon = userMenuActions.settings.icon
  const ExtrasIcon = userMenuActions.extras.icon
  const displayName =
    user?.user_metadata.full_name ??
    user?.user_metadata.name ??
    user?.email?.split("@")[0] ??
    "Account"
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() ?? "")
    .join("")

  async function handleSignOut() {
    await signOut()
    router.push(portalRoutes.signIn)
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open user menu"
            className="rounded-full"
          />
        }
      >
        <Avatar size="sm">
          <AvatarFallback>{isLoading ? "…" : initials || "A"}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        {isSignedIn && user ? (
          <>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col gap-0.5">
                  <span className="truncate text-xs font-medium">
                    {displayName}
                  </span>
                  <span className="truncate text-[11px] font-normal text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
          </>
        ) : null}

        <DropdownMenuGroup>
          <DropdownMenuLabel>Theme</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={preference}
            onValueChange={(value) => {
              const next = value as ThemePreference
              setThemePreference(next)
              setPreference(next)
            }}
          >
            {themeMenuOptions.map((option) => {
              const Icon = themeIcons[option.value]

              return (
                <DropdownMenuRadioItem key={option.value} value={option.value}>
                  <Icon />
                  {option.label}
                </DropdownMenuRadioItem>
              )
            })}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem render={<Link href={userMenuActions.settings.href} />}>
          <SettingsIcon />
          {userMenuActions.settings.label}
        </DropdownMenuItem>

        <DropdownMenuItem disabled>
          <ExtrasIcon />
          {userMenuActions.extras.label}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {isSignedIn ? (
          <DropdownMenuItem onClick={handleSignOut}>
            <SignOutIcon />
            Log out
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem render={<Link href={portalRoutes.signIn} />}>
            <SignInIcon />
            Sign in
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
