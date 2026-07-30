import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Secrets",
}

export default function Page() {
  return <SectionPage eyebrow="Resources" title="Secrets" />
}
