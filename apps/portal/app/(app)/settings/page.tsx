import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { SectionPage } from "@/components/section-page"
import { SettingsView } from "@/components/settings/settings-view"
import { getUserProfileSummary } from "@/lib/data/user-settings"
import { portalRoutes } from "@/lib/content"

export const metadata: Metadata = {
  title: "Settings",
}

export default async function SettingsPage() {
  const profile = await getUserProfileSummary()

  if (!profile) {
    redirect(portalRoutes.signIn)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-1 py-2 sm:px-2 lg:px-4">
        <SectionPage
          align="center"
          eyebrow="Administration"
          title="Settings"
          description="Manage your profile, appearance, and account data."
        >
          <SettingsView profile={profile} />
        </SectionPage>
      </div>
    </div>
  )
}
