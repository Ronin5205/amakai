import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Workflow Editor",
}

export default function Page() {
  return <SectionPage eyebrow="Design" title="Workflow Editor" />
}
