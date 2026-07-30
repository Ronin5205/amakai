import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Knowledge Base",
}

export default function Page() {
  return <SectionPage eyebrow="Resources" title="Knowledge Base" />
}
