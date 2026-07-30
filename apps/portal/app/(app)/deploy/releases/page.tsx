import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Releases",
}

export default function Page() {
  return <SectionPage eyebrow="Deploy" title="Releases" />
}
