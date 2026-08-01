import type { Metadata } from "next"

import { TestingView } from "@/components/design/testing-view"
import { listWorkflows } from "@/lib/data/workflows"

export const metadata: Metadata = {
  title: "Testing",
}

export default async function TestingPage() {
  const workflows = await listWorkflows()

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-4 md:p-6 lg:p-8">
      <TestingView workflows={workflows} />
    </div>
  )
}
