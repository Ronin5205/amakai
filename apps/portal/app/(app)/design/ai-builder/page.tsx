import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "AI Builder",
}

export default function Page() {
  return <SectionPage eyebrow="Design" title="AI Builder" />
}
