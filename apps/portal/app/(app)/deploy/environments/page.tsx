import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Environments",
}

export default function Page() {
  return <SectionPage eyebrow="Deploy" title="Environments" />
}
