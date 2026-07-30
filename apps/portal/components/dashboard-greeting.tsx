"use client"

import { usePortalSession } from "@/hooks/use-portal-session"
import { SectionPage } from "@/components/section-page"

export function DashboardGreeting() {
  const { username, isLoading } = usePortalSession()

  return (
    <SectionPage
      eyebrow="Overview"
      title={
        isLoading
          ? "Dashboard"
          : username
            ? `Welcome back, ${username}`
            : "Dashboard"
      }
      description="Your automation workspace overview will appear here."
    />
  )
}
