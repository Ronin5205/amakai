import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Dashboard",
}

export default function DashboardPage() {
  return <SectionPage title="Dashboard" />
}
