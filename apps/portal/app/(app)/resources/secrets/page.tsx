import type { Metadata } from "next"
import { Suspense } from "react"

import { SecretsView } from "@/components/views/secrets-view"
import { listSecrets } from "@/lib/data/secrets"

export const metadata: Metadata = {
  title: "Secrets",
}

export default async function Page() {
  const secrets = await listSecrets()

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
      <Suspense fallback={null}>
        <SecretsView secrets={secrets} />
      </Suspense>
    </div>
  )
}
