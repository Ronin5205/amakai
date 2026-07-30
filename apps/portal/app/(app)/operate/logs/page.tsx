import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Logs",
}

export default function Page() {
  return <SectionPage eyebrow="Operate" title="Logs" />
}
