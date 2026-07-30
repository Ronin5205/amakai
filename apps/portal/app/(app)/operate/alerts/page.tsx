import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Alerts",
}

export default function Page() {
  return <SectionPage eyebrow="Operate" title="Alerts" />
}
