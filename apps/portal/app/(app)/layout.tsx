import { AppSidebar } from "@/components/app-sidebar"
import { PortalHeader } from "@/components/portal-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@amakai/shared/components/ui/sidebar"
import { TooltipProvider } from "@amakai/shared/components/ui/tooltip"

export default function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <PortalHeader />
          <div className="relative flex flex-1 flex-col">
            <div
              aria-hidden="true"
              className="hairline-dots pointer-events-none absolute inset-0 opacity-40"
            />
            <div className="relative flex flex-1 flex-col p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
