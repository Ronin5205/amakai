import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"
import { ReleasesView } from "@/components/views/releases-view"
import { listReleases } from "@/lib/data/deployments"

export const metadata: Metadata = {
  title: "Releases",
}

export default async function Page() {
  const releases = await listReleases()

  return (
    <SectionPage
      eyebrow="Deploy"
      title="Releases"
      description="Track release history, deployment status, and who promoted each version."
    >
      <ReleasesView releases={releases} />
    </SectionPage>
  )
}
