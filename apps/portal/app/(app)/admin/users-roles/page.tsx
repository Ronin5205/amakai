import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "Users & Roles",
}

export default function Page() {
  return <SectionPage eyebrow="Administration" title="Users & Roles" />
}
