import * as React from "react"
import Link from "next/link"

import { siteConfig } from "@/lib/content"
import { Logo } from "@/components/logo"
import { ThemeToggle } from "@/components/theme-toggle"

/**
 * Deliberately bare: no marketing nav, so the portal routes already look like
 * an application shell rather than a continuation of the landing page.
 */
export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-5 py-16">
      <div
        aria-hidden="true"
        className="hairline-grid fade-edges pointer-events-none absolute inset-0"
      />

      <div className="absolute end-4 top-4">
        <ThemeToggle />
      </div>

      <div className="relative flex w-full max-w-md flex-col gap-8">
        <Link
          href="/"
          aria-label={`${siteConfig.name} home`}
          className="mx-auto w-fit outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <Logo />
        </Link>
        {children}
      </div>
    </div>
  )
}
