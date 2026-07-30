import type { Metadata } from "next"

import { DashboardGreeting } from "@/components/dashboard-greeting"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default function DashboardPage() {
  return <DashboardGreeting />
}
