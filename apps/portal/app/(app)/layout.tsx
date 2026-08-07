import { AppSidebar } from "@/components/app-sidebar"
import { AssistantShell } from "@/components/ai/assistant-shell"
import { PortalHeader } from "@/components/portal-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@amakai/shared/components/ui/sidebar"
import { TooltipProvider } from "@amakai/shared/components/ui/tooltip"
import { Suspense } from "react"

export default function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <Suspense fallback={null}>
          <AppSidebar />
        </Suspense>
        <SidebarInset className="min-w-0 overflow-hidden">
          <AssistantShell>
            <PortalHeader />
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
              <div
                aria-hidden="true"
                className="hairline-dots pointer-events-none absolute inset-0 opacity-40"
              />
              <div className="relative flex flex-1 flex-col p-4 md:p-6 lg:p-8">
                {children}
              </div>
            </div>
          </AssistantShell>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
