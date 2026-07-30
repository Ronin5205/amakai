import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"

export const metadata: Metadata = {
  title: "API & SDK",
}

export default function Page() {
  return <SectionPage eyebrow="Administration" title="API & SDK" />
}
