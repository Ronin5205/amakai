import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Monitoring",
}

export default function Page() {
  return <SectionPage eyebrow="Operate" title="Monitoring" />
}
