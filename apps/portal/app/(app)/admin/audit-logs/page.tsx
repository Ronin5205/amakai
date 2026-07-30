import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Audit Logs",
}

export default function Page() {
  return <SectionPage eyebrow="Administration" title="Audit Logs" />
}
