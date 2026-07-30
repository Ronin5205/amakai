import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Performance",
}

export default function Page() {
  return <SectionPage eyebrow="Optimize" title="Performance" />
}
