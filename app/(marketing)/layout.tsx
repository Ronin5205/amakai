import * as React from "react"

import { SiteFooter } from "@/components/site-footer"
import { SiteHeader } from "@/components/site-header"

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-svh flex-col">
      {/* Parked off-screen with a transform rather than `sr-only`, so the
          focused styles cannot be undone by utility ordering. */}
      <a
        href="#main-content"
        className="fixed start-4 top-4 z-50 -translate-y-24 border border-border bg-background px-3 py-2 text-sm transition-transform focus-visible:translate-y-0"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
