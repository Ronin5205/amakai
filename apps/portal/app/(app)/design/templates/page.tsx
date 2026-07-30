import type { Metadata } from "next"

import { TemplatesView } from "@/components/views/templates-view"
import { listTemplates } from "@/lib/data/templates"

export const metadata: Metadata = {
  title: "Templates",
}

export default async function TemplatesPage() {
  const templates = await listTemplates()

  return <TemplatesView templates={templates} />
}
