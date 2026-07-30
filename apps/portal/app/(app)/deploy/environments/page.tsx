import type { Metadata } from "next"

import { SectionPage } from "@/components/section-page"
import { EnvironmentsView } from "@/components/views/environments-view"
import { listEnvironments } from "@/lib/data/deployments"

export const metadata: Metadata = {
  title: "Environments",
}

export default async function Page() {
  const environments = await listEnvironments()

  return (
    <SectionPage
      eyebrow="Deploy"
      title="Environments"
      description="Monitor deployment targets, active versions, and runtime health across your workflow environments."
    >
      <EnvironmentsView environments={environments} />
    </SectionPage>
  )
}
