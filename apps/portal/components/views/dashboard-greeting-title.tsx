"use client"

import { usePortalSession } from "@/hooks/use-portal-session"

export function DashboardGreetingTitle() {
  const { username, isLoading } = usePortalSession()

  if (isLoading) {
    return "Dashboard"
  }

  return username ? `Welcome back, ${username}` : "Dashboard"
}
