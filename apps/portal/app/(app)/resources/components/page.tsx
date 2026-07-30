import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Components",
}

export default function Page() {
  return <SectionPage eyebrow="Resources" title="Components" />
}
