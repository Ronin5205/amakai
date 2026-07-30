import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Analytics",
}

export default function Page() {
  return <SectionPage eyebrow="Optimize" title="Analytics" />
}
