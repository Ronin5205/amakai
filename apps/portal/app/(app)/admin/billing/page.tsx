import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Billing",
}

export default function Page() {
  return <SectionPage eyebrow="Administration" title="Billing" />
}
