import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"
import { VersionsView } from "@/components/views/versions-view"
import { listVersions } from "@/lib/data/deployments"

export const metadata: Metadata = {
  title: "Versions",
}

export default async function Page() {
  const versions = await listVersions()

  return (
    <SectionPage
      eyebrow="Deploy"
      title="Versions"
      description="Review published workflow versions, track authorship, and manage rollbacks."
    >
      <VersionsView versions={versions} />
    </SectionPage>
  )
}
