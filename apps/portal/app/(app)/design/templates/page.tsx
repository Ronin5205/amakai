import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Templates",
}

export default function Page() {
  return <SectionPage eyebrow="Design" title="Templates" />
}
