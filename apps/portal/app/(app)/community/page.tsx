import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Community",
}

export default function CommunityPage() {
  return <SectionPage eyebrow="Community" title="Community" />
}
