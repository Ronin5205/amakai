import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Cost Optimization",
}

export default function Page() {
  return <SectionPage eyebrow="Optimize" title="Cost Optimization" />
}
