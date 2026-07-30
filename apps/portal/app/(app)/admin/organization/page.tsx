import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Organization",
}

export default function Page() {
  return <SectionPage eyebrow="Administration" title="Organization" />
}
